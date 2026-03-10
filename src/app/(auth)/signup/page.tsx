import { redirect } from 'next/navigation'

// OAuth handles both sign-up and sign-in — no separate page needed
export default function SignupPage() {
  redirect('/login')
}
