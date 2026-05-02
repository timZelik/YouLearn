import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from '@/components/onboarding/OnboardingForm'

export default async function NewPathPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('paths_created, max_free_paths, onboarding_completed')
    .eq('id', user.id)
    .single()

  // Brand-new users belong on /onboarding (sets onboarding_completed flag for the first time)
  if (!profile?.onboarding_completed) redirect('/onboarding')

  // Free-tier cap reached — bounce back with a flag so dashboard can flash a message
  if (profile && profile.paths_created >= profile.max_free_paths) {
    redirect('/dashboard?cap=reached')
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to dashboard
        </Link>
      </div>
      <div className="mb-10 mt-6 text-center">
        <span className="text-2xl font-bold tracking-tight">YouLearn</span>
        <h1 className="mt-4 text-3xl font-extrabold">Start a new topic</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tell Claude what you want to learn next.{' '}
          <span className="opacity-70">
            ({profile.paths_created} of {profile.max_free_paths} paths used)
          </span>
        </p>
      </div>
      <OnboardingForm />
    </div>
  )
}
