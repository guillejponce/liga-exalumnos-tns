'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

const CAROUSEL_IMAGES = [
  '/assets/carousel/IMG_5957.jpeg',
  '/assets/carousel/IMG_5958.jpeg',
  '/assets/carousel/IMG_5965.jpeg',
  '/assets/carousel/IMG_7112.jpeg',
  '/assets/carousel/IMG_7114.jpeg',
  '/assets/carousel/IMG_7274.jpeg',
  '/assets/carousel/IMG_7351.jpeg',
  '/assets/carousel/IMG_7502.jpeg',
]

// Fisher–Yates shuffle para orden aleatorio
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const SLIDES = shuffle(CAROUSEL_IMAGES).map((src) => ({
  src,
  alt: 'Liga Nico Sabag',
}))

const PLACEHOLDER_GRADIENTS = [
  'from-navy-900 via-league-green/20 to-navy-950',
  'from-navy-950 via-navy-800 to-league-green/10',
  'from-league-green/10 via-navy-900 to-navy-950',
  'from-navy-800 via-navy-950 to-league-green/15',
  'from-navy-950 via-league-green/15 to-navy-900',
  'from-navy-900 via-navy-950 to-league-green/20',
  'from-navy-800 via-league-green/10 to-navy-950',
  'from-navy-950 via-navy-900 to-league-green/15',
]

const INTERVAL_MS = 5000

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(next, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [next])

  function handleImgError(index: number) {
    setImgErrors((prev) => new Set(prev).add(index))
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {imgErrors.has(i) ? (
            <div className={`h-full w-full bg-linear-to-br ${PLACEHOLDER_GRADIENTS[i]}`} />
          ) : (
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              className="object-cover"
              priority={i === 0}
              onError={() => handleImgError(i)}
            />
          )}
        </div>
      ))}

      <div className="absolute inset-0 bg-linear-to-t from-navy-950 via-navy-950/70 to-navy-950/40" />

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? 'w-8 bg-league-green'
                : 'w-1.5 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Ir a slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
