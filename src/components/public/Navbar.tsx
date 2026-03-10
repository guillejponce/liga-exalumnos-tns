'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/tabla', label: 'Tabla' },
  { href: '/fixture', label: 'Fixture' },
  { href: '/equipos', label: 'Equipos' },
] as const

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="bg-navy-900 border-b border-navy-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-league-green">
              <span className="text-sm font-bold text-white">NS</span>
            </div>
            <span className="text-lg font-bold text-white">
              Liga Nico Sabag
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-navy-800 text-league-green'
                      : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="ml-2 h-5 w-px bg-navy-700" />
            <Link
              href="/admin"
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-400 transition-colors hover:bg-navy-800 hover:text-white"
            >
              Admin
            </Link>
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-navy-200 hover:bg-navy-800 hover:text-white sm:hidden"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-navy-700 sm:hidden">
          <nav className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-navy-800 text-league-green'
                      : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="my-2 h-px bg-navy-700" />
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-navy-400 transition-colors hover:bg-navy-800 hover:text-white"
            >
              Panel Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
