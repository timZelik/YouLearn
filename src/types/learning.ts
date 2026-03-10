export interface TestCase {
  input: string
  expected_output: string
  is_hidden: boolean
  order_index: number
}

export interface Lesson {
  title: string
  theory_markdown: string
  exercise_prompt: string
  starter_code: string
  solution_code: string
  judge0_language_id: number
  difficulty: 'intro' | 'easy' | 'medium' | 'hard' | 'capstone'
  order_index: number
  test_cases: TestCase[]
}

export interface Course {
  title: string
  description: string
  order_index: number
  lessons: Lesson[]
}

export interface LearningPathResponse {
  title: string
  description: string
  courses: Course[]
}

export interface TestResult {
  input: string
  expected_output: string
  actual_output: string
  passed: boolean
  is_hidden: boolean
  error?: string
}

export interface ExecutionResult {
  test_results: TestResult[]
  all_passed: boolean
  submission_id: string
}

export interface AIFeedback {
  score: number
  correctness_summary: string
  explanation: string
  improvement_tips: string[]
  optimized_approach: string
}

export interface OnboardingData {
  background: string
  goals: string
  preferred_language: string
  experience_level: string
}
