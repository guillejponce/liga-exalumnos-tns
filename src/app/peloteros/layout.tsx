import Link from 'next/link'
import Image from 'next/image'
import { isPeloterosAuthorized } from '@/actions/peloteros-auth'
import PeloterosLogin from './PeloterosLogin'

export const metadata = { title: 'Peloteros — Liga Nico Sabag' }

export default async function PeloterosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authorized = await isPeloterosAuthorized()

  if (!authorized) {
    return <PeloterosLogin />
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-30 border-b border-navy-800 bg-navy-900">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/peloteros" className="flex items-center gap-2">
            <Image
              src="/assets/Ligas Newland blanco.png"
              alt="Liga Nico Sabag"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
            <span className="rounded bg-league-green/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-league-green">
              Live
            </span>
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-navy-700 px-3 py-1.5 text-xs text-navy-400 transition-colors hover:text-white"
          >
            Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">
        {children}
      </main>
    </div>
  )
}
