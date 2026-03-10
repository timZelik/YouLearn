'use client'

import { useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

const JUDGE0_TO_MONACO_LANG: Record<number, string> = {
  71: 'python',
  63: 'javascript',
  74: 'typescript',
  62: 'java',
  54: 'cpp',
  50: 'c',
  60: 'go',
  73: 'rust',
  72: 'ruby',
  83: 'swift',
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  languageId: number
  height?: string
}

export default function CodeEditor({
  value,
  onChange,
  languageId,
  height = '400px',
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const language = JUDGE0_TO_MONACO_LANG[languageId] ?? 'plaintext'

  return (
    <div className="overflow-hidden rounded-lg border">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        onMount={(ed) => {
          editorRef.current = ed
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          fontFamily: 'var(--font-geist-mono), "Fira Code", monospace',
          padding: { top: 12, bottom: 12 },
          theme: 'vs-dark',
        }}
        theme="vs-dark"
      />
    </div>
  )
}
