'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { OnboardingData } from '@/types/learning'

const LANGUAGES = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C', 'Go', 'Rust', 'Ruby', 'Swift',
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner — just starting out' },
  { value: 'intermediate', label: 'Intermediate — built a few projects' },
  { value: 'advanced', label: 'Advanced — professional experience' },
]

const STEPS = [
  {
    id: 'background',
    title: 'Tell us about yourself',
    subtitle: "What's your coding background? What have you built or studied?",
    placeholder: "e.g. I have a CS degree but mostly studied theory. I've done some web dev tutorials but never built a real project...",
  },
  {
    id: 'goals',
    title: 'What do you want to achieve?',
    subtitle: 'Be specific — the more detail, the better your curriculum.',
    placeholder: 'e.g. I want to land a backend engineering role at a startup. I need to get comfortable with data structures, system design basics, and building REST APIs...',
  },
  {
    id: 'preferred_language',
    title: 'Choose your primary language',
    subtitle: 'Your curriculum will use this language throughout.',
  },
  {
    id: 'experience_level',
    title: 'What\'s your experience level?',
    subtitle: 'This helps us calibrate the difficulty of your first lessons.',
  },
]

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const current = STEPS[step]
  const isTextStep = step < 2
  const isLast = step === STEPS.length - 1

  function canAdvance(): boolean {
    if (step === 0) return (data.background?.trim().length ?? 0) >= 10
    if (step === 1) return (data.goals?.trim().length ?? 0) >= 10
    if (step === 2) return !!data.preferred_language
    if (step === 3) return !!data.experience_level
    return false
  }

  async function handleNext() {
    if (!isLast) {
      setStep((s) => s + 1)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <div>
          <h2 className="text-xl font-semibold">Building your learning path...</h2>
          <p className="text-muted-foreground mt-1">Claude is creating your personalized 5-course curriculum. This takes 10–20 seconds.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-xl">
      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {/* Step content */}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{current.title}</h2>
        <p className="text-muted-foreground">{current.subtitle}</p>
      </div>

      {/* Input */}
      {isTextStep && (
        <Textarea
          placeholder={current.placeholder}
          className="min-h-[140px] resize-none"
          value={step === 0 ? (data.background ?? '') : (data.goals ?? '')}
          onChange={(e) => {
            const key = step === 0 ? 'background' : 'goals'
            setData((d) => ({ ...d, [key]: e.target.value }))
          }}
        />
      )}

      {step === 2 && (
        <Select
          value={data.preferred_language ?? ''}
          onValueChange={(v) => setData((d) => ({ ...d, preferred_language: v ?? undefined }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang.toLowerCase()}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {step === 3 && (
        <Select
          value={data.experience_level ?? ''}
          onValueChange={(v) => setData((d) => ({ ...d, experience_level: v as OnboardingData['experience_level'] }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your level" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        <Button className="flex-1" onClick={handleNext} disabled={!canAdvance()}>
          {isLast ? 'Build my learning path' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
