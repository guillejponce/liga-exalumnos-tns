import Image from 'next/image'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export function getCrestUrl(crestPath: string | null): string | null {
  if (!crestPath) return null
  const path = crestPath.replace(/\.(jpe?g)$/i, '.png')
  return `${SUPABASE_URL}/storage/v1/object/public/public_liga/${path}`
}

export default function TeamCrest({
  crestPath,
  name,
  size = 32,
  className = '',
}: {
  crestPath: string | null
  name: string
  size?: number
  className?: string
}) {
  const url = getCrestUrl(crestPath)

  if (!url) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-navy-800 font-bold text-navy-400 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={url}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 rounded-lg object-contain ${className}`}
      unoptimized
    />
  )
}
