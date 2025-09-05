'use client'
import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function SignUpPage() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else window.location.href = '/sign-in'
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto p-4">
      <h1 className="text-xl mb-4">Sign Up</h1>

      <input
        className="border p-2 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-3"
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button className="border px-4 py-2 rounded w-full">Create account</button>

      <div className="mt-4">
        <a href="/sign-in" className="text-blue-600 underline">
          Уже есть аккаунт? Sign In
        </a>
      </div>
    </form>
  )
}
