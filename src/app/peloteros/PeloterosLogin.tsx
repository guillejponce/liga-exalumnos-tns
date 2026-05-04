'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { loginPeloteros } from '@/actions/peloteros-auth'

export default function PeloterosLogin() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await loginPeloteros(formData)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.refresh()
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
          <h1 className="mt-4 text-xl font-bold text-white">Peloteros</h1>
          <p className="mt-1 text-sm text-navy-400">
            Ingresa con tu cuenta de peloteros
          </p>
        </div>

        <form action={handleLogin} className="mt-8 space-y-4">
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
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
