export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          current_streak: number
          longest_streak: number
          last_activity_date: string | null
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          onboarding_completed?: boolean
        }
        Relationships: []
      }
      onboarding_responses: {
        Row: {
          id: string
          user_id: string
          created_at: string
          background: string
          goals: string
          preferred_language: string
          experience_level: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          background: string
          goals: string
          preferred_language: string
          experience_level: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          background?: string
          goals?: string
          preferred_language?: string
          experience_level?: string
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          id: string
          user_id: string
          created_at: string
          title: string
          description: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          title: string
          description: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          title?: string
          description?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          learning_path_id: string
          user_id: string
          created_at: string
          title: string
          description: string
          order_index: number
        }
        Insert: {
          id?: string
          learning_path_id: string
          user_id: string
          created_at?: string
          title: string
          description: string
          order_index: number
        }
        Update: {
          id?: string
          learning_path_id?: string
          user_id?: string
          created_at?: string
          title?: string
          description?: string
          order_index?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          user_id: string
          created_at: string
          title: string
          theory_markdown: string
          exercise_prompt: string
          starter_code: string
          solution_code: string
          judge0_language_id: number
          difficulty: string
          order_index: number
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          created_at?: string
          title: string
          theory_markdown: string
          exercise_prompt: string
          starter_code: string
          solution_code: string
          judge0_language_id: number
          difficulty: string
          order_index: number
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          created_at?: string
          title?: string
          theory_markdown?: string
          exercise_prompt?: string
          starter_code?: string
          solution_code?: string
          judge0_language_id?: number
          difficulty?: string
          order_index?: number
        }
        Relationships: []
      }
      test_cases: {
        Row: {
          id: string
          lesson_id: string
          created_at: string
          input: string
          expected_output: string
          is_hidden: boolean
          order_index: number
        }
        Insert: {
          id?: string
          lesson_id: string
          created_at?: string
          input: string
          expected_output: string
          is_hidden?: boolean
          order_index: number
        }
        Update: {
          id?: string
          lesson_id?: string
          created_at?: string
          input?: string
          expected_output?: string
          is_hidden?: boolean
          order_index?: number
        }
        Relationships: []
      }
      submissions: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          created_at: string
          code: string
          test_results: Json
          all_passed: boolean
          status: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          created_at?: string
          code: string
          test_results: Json
          all_passed: boolean
          status: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          created_at?: string
          code?: string
          test_results?: Json
          all_passed?: boolean
          status?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          id: string
          submission_id: string
          user_id: string
          created_at: string
          score: number
          correctness_summary: string
          explanation: string
          improvement_tips: string[]
          optimized_approach: string
        }
        Insert: {
          id?: string
          submission_id: string
          user_id: string
          created_at?: string
          score: number
          correctness_summary: string
          explanation: string
          improvement_tips: string[]
          optimized_approach: string
        }
        Update: {
          id?: string
          submission_id?: string
          user_id?: string
          created_at?: string
          score?: number
          correctness_summary?: string
          explanation?: string
          improvement_tips?: string[]
          optimized_approach?: string
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          course_id: string
          created_at: string
          updated_at: string
          status: string
          best_score: number
          attempts: number
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          course_id: string
          created_at?: string
          updated_at?: string
          status?: string
          best_score?: number
          attempts?: number
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          course_id?: string
          created_at?: string
          updated_at?: string
          status?: string
          best_score?: number
          attempts?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_learning_path: {
        Args: { payload: Json }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
