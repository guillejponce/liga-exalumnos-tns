'use client'

import { useState } from 'react'
import Image from 'next/image'
import { loginWithPassword, loginWithOtp } from '@/actions/auth'

type AuthMode = 'password' | 'magic-link'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('password')
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handlePasswordLogin(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await loginWithPassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleMagicLink(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await loginWithOtp(formData)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Image
            src="/assets/Ligas Newland blanco.png"
            alt="Liga Nico Sabag"
            width={200}
            height={60}
            className="mx-auto h-14 w-auto"
          />
          <h1 className="mt-4 text-xl font-bold text-white">Admin — Liga Nico Sabag</h1>
          <p className="mt-1 text-sm text-navy-400">
            Ingresa con tu cuenta autorizada
          </p>
        </div>

        {mode === 'magic-link' && magicSent ? (
          <div className="mt-8 rounded-xl border border-league-green/20 bg-league-green/5 p-6 text-center">
            <svg className="mx-auto h-10 w-10 text-league-green" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <p className="mt-3 text-sm font-medium text-white">Revisa tu correo</p>
            <p className="mt-1 text-xs text-navy-400">Te enviamos un enlace mágico para iniciar sesión.</p>
            <button
              onClick={() => { setMagicSent(false); setMode('password') }}
              className="mt-4 text-xs text-league-green hover:underline"
            >
              Volver al login
            </button>
          </div>
        ) : mode === 'password' ? (
          <form action={handlePasswordLogin} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="mt-1 block w-full rounded-lg border border-navy-700 bg-navy-900 px-3 py-2.5 text-sm text-white placeholder-navy-500 outline-none transition-colors focus:border-league-green focus:ring-1 focus:ring-league-green"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-300">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1 block w-full rounded-lg border border-navy-700 bg-navy-900 px-3 py-2.5 text-sm text-white placeholder-navy-500 outline-none transition-colors focus:border-league-green focus:ring-1 focus:ring-league-green"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-league-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-league-green-dark disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              onClick={() => setMode('magic-link')}
              className="w-full text-center text-xs text-navy-400 hover:text-navy-200"
            >
              Usar enlace mágico (sin contraseña)
            </button>
          </form>
        ) : (
          <form action={handleMagicLink} className="mt-8 space-y-4">
            <div>
              <label htmlFor="otp-email" className="block text-sm font-medium text-navy-300">
                Email
              </label>
              <input
                id="otp-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="mt-1 block w-full rounded-lg border border-navy-700 bg-navy-900 px-3 py-2.5 text-sm text-white placeholder-navy-500 outline-none transition-colors focus:border-league-green focus:ring-1 focus:ring-league-green"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-league-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-league-green-dark disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace mágico'}
            </button>

            <button
              type="button"
              onClick={() => setMode('password')}
              className="w-full text-center text-xs text-navy-400 hover:text-navy-200"
            >
              Usar contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
