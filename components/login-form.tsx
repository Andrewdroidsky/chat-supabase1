'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LoginForm() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // вход по email+паролю
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
    } else {
      window.location.href = '/'
    }
  }

  // сброс пароля
  async function onForgotPassword() {
    if (!email) {
      alert('Введите email в поле выше')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/reset-password',
    })
    alert(error ? error.message : 'Ссылка для сброса пароля отправлена на почту.')
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto p-4">
      <input
        className="border p-2 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-3"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="border px-4 py-2 rounded w-full">Sign In</button>

      <div className="mt-4 flex justify-between">
        <a href="/sign-up" className="text-blue-600 underline">
          Don&apos;t have an account? Sign Up
        </a>

        <button
          type="button"
          onClick={onForgotPassword}
          className="text-blue-600 underline"
        >
          Forgot password?
        </button>
      </div>
    </form>
  )
}