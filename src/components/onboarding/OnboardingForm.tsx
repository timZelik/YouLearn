'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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

// step -1 = wizard, steps 0–3 = manual background/goals/language/level
// We represent wizard as step index 0 in STEPS array, then shift others
const STEPS = [
  {
    id: 'wizard',
    title: 'What do you want to learn?',
    subtitle: 'Type a few keywords and we\'ll suggest some learning profiles for you.',
  },
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

interface Suggestion {
  label: string
  background: string
  goals: string
}

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Wizard state
  const [keywords, setKeywords] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null)

  const current = STEPS[step]
  const isWizardStep = step === 0
  const isTextStep = step === 1 || step === 2
  const isLast = step === STEPS.length - 1

  // Progress bar excludes the wizard step from the count shown to user
  const manualStepCount = STEPS.length - 1 // 4 actual profile steps
  const progressStep = step === 0 ? 0 : step - 1
  const progressPct = step === 0 ? 0 : Math.round((progressStep / manualStepCount) * 100)

  function canAdvance(): boolean {
    if (step === 0) {
      // Wizard: can advance if suggestions loaded and one is selected, OR skipping
      return true // always show Continue (skip) but "Get suggestions" is the primary action
    }
    if (step === 1) return (data.background?.trim().length ?? 0) >= 10
    if (step === 2) return (data.goals?.trim().length ?? 0) >= 10
    if (step === 3) return !!data.preferred_language
    if (step === 4) return !!data.experience_level
    return false
  }

  async function fetchSuggestions() {
    if (keywords.trim().length < 2) return
    setSuggestLoading(true)
    setSuggestError('')
    setSuggestions([])
    setSelectedSuggestion(null)

    try {
      const res = await fetch('/api/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.trim(),
          preferred_language: data.preferred_language,
          experience_level: data.experience_level,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSuggestError(json.error || 'Failed to generate suggestions.')
        return
      }
      setSuggestions(json.suggestions ?? [])
    } catch {
      setSuggestError('Network error. Please try again.')
    } finally {
      setSuggestLoading(false)
    }
  }

  function applySuggestion(idx: number) {
    setSelectedSuggestion(idx)
    const s = suggestions[idx]
    setData((d) => ({ ...d, background: s.background, goals: s.goals }))
  }

  function advanceWithSuggestion() {
    // If a suggestion is selected, skip both text steps (background + goals already set)
    setStep(3) // jump straight to language
  }

  async function handleNext() {
    setError('')

    if (isWizardStep) {
      if (selectedSuggestion !== null) {
        advanceWithSuggestion()
      } else {
        // Skip wizard — go to manual background step
        setStep(1)
      }
      return
    }

    if (!isLast) {
      setStep((s) => s + 1)
      return
    }

    setLoading(true)

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
          <h2 className="text-xl font-semibold">Setting up your path…</h2>
          <p className="text-muted-foreground mt-1">Just a moment — Claude is structuring your curriculum.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-xl">
      {/* Progress — only show after wizard step */}
      {step > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {progressStep} of {manualStepCount}</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} />
        </div>
      )}

      {/* Step content */}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{current.title}</h2>
        <p className="text-muted-foreground">{current.subtitle}</p>
      </div>

      {/* ── Wizard step ── */}
      {isWizardStep && (
        <div className="flex flex-col gap-5">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. machine learning, web scraping, algorithms…"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchSuggestions() }}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={fetchSuggestions}
              disabled={keywords.trim().length < 2 || suggestLoading}
              className="flex-shrink-0"
            >
              {suggestLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Thinking…
                </span>
              ) : 'Get suggestions'}
            </Button>
          </div>

          {suggestError && <p className="text-sm text-red-600">{suggestError}</p>}

          {/* Suggestion cards */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(i)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    selectedSuggestion === i
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <p className="text-sm font-semibold mb-1.5">{s.label}</p>
                  <p className="text-[0.8rem] text-muted-foreground leading-relaxed">{s.background}</p>
                  <p className="text-[0.8rem] text-foreground/70 leading-relaxed mt-1">{s.goals}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Text steps ── */}
      {isTextStep && (
        <Textarea
          placeholder={current.placeholder}
          className="min-h-[140px] resize-none"
          value={step === 1 ? (data.background ?? '') : (data.goals ?? '')}
          onChange={(e) => {
            const key = step === 1 ? 'background' : 'goals'
            setData((d) => ({ ...d, [key]: e.target.value }))
          }}
        />
      )}

      {step === 3 && (
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

      {step === 4 && (
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
        {isWizardStep ? (
          <div className="flex flex-1 gap-2">
            {selectedSuggestion !== null ? (
              <Button className="flex-1" onClick={advanceWithSuggestion}>
                Use this profile →
              </Button>
            ) : (
              <Button className="flex-1" variant="outline" onClick={() => setStep(1)}>
                Write my own instead
              </Button>
            )}
          </div>
        ) : (
          <Button className="flex-1" onClick={handleNext} disabled={!canAdvance()}>
            {isLast ? 'Build my learning path' : 'Continue'}
          </Button>
        )}
      </div>
    </div>
  )
}
