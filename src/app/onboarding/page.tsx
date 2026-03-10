import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from '@/components/onboarding/OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold">Let&apos;s build your curriculum</h1>
        <p className="text-muted-foreground mt-2">Answer 4 quick questions and Claude will craft your personalized path.</p>
      </div>
      <OnboardingForm />
    </div>
  )
}
