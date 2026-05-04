'use server'

import { cookies } from 'next/headers'

const PELOTEROS_EMAIL = 'peloteros-newland@gmail.com'
const PELOTEROS_PASSWORD = 'nicosabagliga2026'
const COOKIE_NAME = 'peloteros_access'
const COOKIE_VALUE = 'authorized'

export async function loginPeloteros(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (email !== PELOTEROS_EMAIL || password !== PELOTEROS_PASSWORD) {
    return { error: 'Credenciales inválidas' }
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: '/',
  })

  return { success: true }
}

export async function isPeloterosAuthorized() {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value === COOKIE_VALUE
}
