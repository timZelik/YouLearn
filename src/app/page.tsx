import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-xl font-bold tracking-tight">YouLearn</span>
        <div className="flex gap-3">
          <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>
            Log in
          </Link>
          <Link href="/signup" className={buttonVariants({ variant: 'default' })}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-6 py-24">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          AI-powered personalized curriculum
        </div>
        <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight leading-tight">
          Your background. Your goals.
          <br />
          <span className="text-blue-600">Your learning path.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Tell us where you are and where you want to go. YouLearn builds a 5-course coding
          curriculum just for you — with an in-browser editor, real test cases, and Claude AI
          feedback on every submission.
        </p>
        <div className="flex gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'px-6')}>
            Build my learning path
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-6')}>
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="grid grid-cols-1 gap-8 px-8 pb-24 sm:grid-cols-3 max-w-5xl mx-auto w-full">
        {[
          {
            icon: '🧠',
            title: 'Personalized by AI',
            desc: 'Claude reads your background and generates a tailored 5-course path with escalating difficulty.',
          },
          {
            icon: '💻',
            title: 'In-browser code editor',
            desc: 'VS Code–quality Monaco editor. Write, run, and submit code without leaving the browser.',
          },
          {
            icon: '✅',
            title: 'Real-time feedback',
            desc: 'Hidden test cases + Claude AI feedback after every submission. Know exactly what to improve.',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
