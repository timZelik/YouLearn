import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

const features = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
    title: 'Personalized by Claude',
    desc: 'Describe your background in plain English. Claude generates a 5-course path calibrated to exactly where you are and where you want to go.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
    title: 'In-browser editor',
    desc: 'Full Monaco editor — the same engine as VS Code. Write, run, and submit code without leaving the browser.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: 'Real feedback, every time',
    desc: 'Hidden test cases catch edge cases. After every submission, Claude scores your code and tells you exactly what to improve.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur-md">
        <span className="text-lg font-bold tracking-tight">YouLearn</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-28 text-center">
        {/* Glow behind hero */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.511_0.262_276.966/0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.585_0.233_277.117/0.2),transparent)]" />

        <div className="relative flex flex-col items-center gap-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1 text-xs font-medium text-primary dark:bg-primary/15">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Powered by Claude AI
          </span>

          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] md:text-6xl">
            Your background.{' '}
            <br className="hidden sm:block" />
            Your goals.{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
              Your path.
            </span>
          </h1>

          <p className="max-w-lg text-base text-muted-foreground md:text-lg">
            Tell us where you are and where you want to go. YouLearn builds a
            personalized 5-course coding curriculum with real exercises, hidden test
            cases, and AI feedback on every submission.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Get started free →
            </Link>
            <span className="text-xs text-muted-foreground">No credit card required</span>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-border bg-muted/40 px-6 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} YouLearn
      </footer>
    </div>
  )
}
