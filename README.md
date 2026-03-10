# YouLearn

**AI-powered personalized coding education.** Describe your background and goals in plain English — YouLearn builds a custom 5-course curriculum just for you, with an in-browser code editor, real test cases, and Claude AI feedback on every submission.

---

## The Problem

Every coding platform gives you the same curriculum in the same order. LeetCode assumes you already know what to study. Udemy courses are pre-recorded and generic. Neither one adapts to *who you actually are* — what you already know, what you're trying to achieve, or how fast you're progressing.

## The Solution

YouLearn asks you four questions on signup:

1. What's your coding background?
2. What do you want to achieve?
3. What language do you prefer?
4. What's your experience level?

Claude then generates a fully personalized 5-course learning path — with escalating difficulty from intro to capstone — stored in a database and ready to work through immediately. Each lesson has theory, a coding exercise, real test cases (including hidden ones), and AI feedback after every submission.

---

## How It Works

```
Onboarding (4 questions)
    ↓
Claude generates 5-course path (JSON, ~150 rows inserted atomically)
    ↓
Dashboard — course cards + streak tracker
    ↓
Lesson view — theory panel + Monaco editor
    ↓
Run → Judge0 executes code against visible test cases
    ↓
Submit → Judge0 runs all test cases (including hidden)
    ↓
Claude analyzes submission → score (0–100) + explanation + tips
    ↓
All passed → streak increments + next lesson unlocked
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | Full-stack, Vercel-native, no separate server |
| Styling | Tailwind CSS + shadcn/ui | Fast to build, accessible components |
| Code Editor | Monaco Editor (`@monaco-editor/react`) | VS Code experience in the browser |
| Code Execution | Judge0 CE (via RapidAPI) | Sandboxed execution, 60+ languages |
| Database | Supabase (PostgreSQL + Auth) | RLS, real-time, managed Postgres |
| AI | Anthropic Claude (`claude-sonnet-4-6`) | Structured JSON output for path gen + feedback |
| Deployment | Vercel + GitHub Actions | Auto CI/CD on every push to `main` |

---

## Features

- **Personalized curriculum** — Claude reads your exact background and goals, not a dropdown
- **5 courses × 4–6 lessons** — difficulty escalates from intro → easy → medium → hard → capstone
- **In-browser Monaco editor** — syntax highlighting, VS Code keybindings, no setup required
- **Real code execution** — Judge0 runs your code against actual test cases, not just regex checks
- **Hidden test cases** — 2 visible + 2 hidden per lesson; hidden ones only run on Submit
- **AI feedback** — score, correctness summary, explanation, improvement tips, and optimized approach after every submission
- **Daily streak tracking** — 7-day heatmap, current streak, longest streak
- **GitHub OAuth** — one-click sign in, no passwords
- **Mobile-responsive** — tabbed layout on small screens (Theory / Editor / Results)
- **Row-level security** — every table locked to `auth.uid()` via Supabase RLS; solution code never exposed to the client

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # GitHub OAuth sign-in page
│   ├── auth/callback/         # OAuth code exchange
│   ├── onboarding/            # 4-step onboarding wizard
│   ├── dashboard/             # Course cards + streak widget
│   ├── learn/[courseId]/      # Course overview
│   ├── learn/[courseId]/[lessonId]/  # Core product screen
│   └── api/
│       ├── onboarding/        # Claude path generation + DB insert
│       ├── execute/           # Judge0 integration (hidden test cases server-side)
│       ├── feedback/          # Claude code review
│       └── progress/          # Streak updates
├── components/
│   ├── onboarding/            # 4-step wizard component
│   ├── dashboard/             # CourseCard, StreakWidget, ProgressRing
│   └── lesson/                # LessonLayout, CodeEditor, TestCasePanel, FeedbackPanel
├── lib/
│   ├── supabase/              # Browser + server + service role clients
│   ├── claude/                # generateLearningPath, generateFeedback
│   └── judge0/                # execute + exponential backoff polling
├── hooks/
│   └── useCodeExecution.ts    # Run/submit flow + auto-feedback trigger
└── types/
    ├── database.ts            # Supabase table types
    └── learning.ts            # Domain types (LearningPath, TestResult, AIFeedback)

supabase/
└── migrations/0001_initial.sql  # Full schema + RLS + triggers + stored procedure
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Extends auth.users; holds streak data and onboarding status |
| `onboarding_responses` | Raw user input from the 4-step wizard |
| `learning_paths` | One per user; generated title + description |
| `courses` | 5 per path, ordered by `order_index` |
| `lessons` | 4–6 per course; theory, exercise, starter/solution code, difficulty |
| `test_cases` | 4 per lesson (2 visible, 2 hidden); stdin/stdout format |
| `submissions` | Every run and submit; stores code + test results JSONB |
| `ai_feedback` | One per submission; score, explanation, tips, optimized approach |
| `user_lesson_progress` | Upserted on completion; best score, attempts, status |

The entire learning path (150+ rows) is inserted atomically via a Postgres stored procedure `create_learning_path(payload jsonb)` to avoid partial state if Claude or the API fails mid-insert.

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key
- A [Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce) RapidAPI key (free tier: 50 calls/day)
- A GitHub OAuth App

### Setup

```bash
git clone https://github.com/timZelik/YouLearn
cd YouLearn
npm install
```

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
JUDGE0_API_KEY=
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run the database migration in your Supabase SQL editor:

```bash
# paste contents of supabase/migrations/0001_initial.sql into Supabase SQL Editor
```

Enable GitHub OAuth in Supabase:
- Supabase Dashboard → Authentication → Providers → GitHub
- Create a GitHub OAuth App with callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

Push to `main` → Vercel auto-deploys (connect repo at [vercel.com/new](https://vercel.com/new)).

Add all `.env.local` values as environment variables in the Vercel project settings.

GitHub Actions runs `tsc --noEmit` on every pull request.

---

## Security Notes

- `solution_code` is never returned to the client — only fetched server-side via the `service_role` key in `/api/execute`
- Hidden test cases are only accessible server-side via the same service role key
- Every Supabase table has RLS policies enforcing `auth.uid() = user_id`
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are never prefixed with `NEXT_PUBLIC_`

---

Built by [Tim Zelikovsky](https://github.com/timZelik)
