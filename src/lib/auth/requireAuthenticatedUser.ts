import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type AuthenticatedContext = {
  user: User
  supabase: SupabaseClient<Database>
}

type AuthResult =
  | { authenticated: true; context: AuthenticatedContext }
  | { authenticated: false; response: NextResponse }

/**
 * Verifies the incoming request carries a valid Supabase session.
 * Returns the authenticated user + an already-initialised supabase client
 * so callers never have to repeat the client-creation / getUser dance.
 *
 * Usage:
 *   const auth = await requireAuthenticatedUser()
 *   if (!auth.authenticated) return auth.response
 *   const { user, supabase } = auth.context
 */
export async function requireAuthenticatedUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { authenticated: true, context: { user, supabase } }
}
