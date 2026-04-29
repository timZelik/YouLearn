'use client'

import { TestResult } from '@/types/learning'

interface TestCasePanelProps {
  results: TestResult[]
  loading: boolean
}

export default function TestCasePanel({ results, loading }: TestCasePanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent flex-shrink-0" />
        Running test cases…
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground">
        Click <strong className="text-foreground font-medium">Run</strong> to test visible cases, or{' '}
        <strong className="text-foreground font-medium">Submit</strong> to run all cases + get AI feedback.
      </p>
    )
  }

  const passCount = results.filter((r) => r.passed).length
  const allPassed = passCount === results.length

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Summary row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test results</span>
        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          allPassed
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
        }`}>
          {passCount}/{results.length} passed
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {results.map((result, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 text-sm ${
              result.passed
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base leading-none">{result.passed ? '✅' : '❌'}</span>
              <span className="font-medium text-foreground">
                Test {i + 1}{result.is_hidden ? ' · hidden' : ''}
              </span>
            </div>

            {!result.is_hidden && (
              <div className="flex flex-col gap-1 text-xs font-mono">
                {result.input && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Input</span>
                    <span className="text-foreground">{result.input}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 flex-shrink-0">Expected</span>
                  <span className="text-foreground">{result.expected_output}</span>
                </div>
                {!result.passed && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Got</span>
                    <span className="text-red-600 dark:text-red-400">{result.actual_output || '(no output)'}</span>
                  </div>
                )}
                {result.error && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Error</span>
                    <span className="text-red-600 dark:text-red-400">{result.error}</span>
                  </div>
                )}
              </div>
            )}

            {result.is_hidden && !result.passed && (
              <p className="text-xs text-muted-foreground">This hidden test case failed.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
