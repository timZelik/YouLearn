'use client'

import { Badge } from '@/components/ui/badge'
import { TestResult } from '@/types/learning'

interface TestCasePanelProps {
  results: TestResult[]
  loading: boolean
}

export default function TestCasePanel({ results, loading }: TestCasePanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Running test cases...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Click <strong>Run</strong> to test visible cases, or <strong>Submit</strong> to run all cases + get AI feedback.
      </div>
    )
  }

  const passCount = results.filter((r) => r.passed).length

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">Results</span>
        <Badge className={passCount === results.length ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {passCount}/{results.length} passed
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {results.map((result, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 text-sm ${
              result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-2">
              <span>{result.passed ? '✅' : '❌'}</span>
              <span>Test {i + 1}{result.is_hidden ? ' (hidden)' : ''}</span>
            </div>

            {!result.is_hidden && (
              <div className="flex flex-col gap-1 text-xs font-mono">
                {result.input && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Input:</span>
                    <span className="text-gray-700">{result.input}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 flex-shrink-0">Expected:</span>
                  <span className="text-gray-700">{result.expected_output}</span>
                </div>
                {!result.passed && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Got:</span>
                    <span className="text-red-700">{result.actual_output || '(no output)'}</span>
                  </div>
                )}
                {result.error && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Error:</span>
                    <span className="text-red-700">{result.error}</span>
                  </div>
                )}
              </div>
            )}

            {result.is_hidden && !result.passed && (
              <p className="text-xs text-muted-foreground">Hidden test case failed.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
