'use client'

import { useSearchParams } from 'next/navigation'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const errorMessage = useSearchParams().get('error')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">YouLearn</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your personalized coding curriculum</p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Sign in to continue learning</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {errorMessage && (
              <p className="text-sm text-red-600 text-center">Sign in failed. Please try again.</p>
            )}
            <GoogleSignInButton />
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          No account needed — signing in creates one automatically.
        </p>
      </div>
    </div>
  )
}
