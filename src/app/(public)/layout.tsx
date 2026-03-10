import Navbar from '@/components/public/Navbar'

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-navy-800 bg-navy-900 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-navy-400">
          © {new Date().getFullYear()} Liga Nico Sabag — Exalumnos Newland
        </div>
      </footer>
    </div>
  )
}
