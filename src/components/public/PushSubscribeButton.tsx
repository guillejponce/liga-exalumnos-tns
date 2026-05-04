'use client'

import { useState, useEffect } from 'react'
import { subscribePush, unsubscribePush } from '@/actions/push'

type PushState = 'loading' | 'unsupported' | 'denied' | 'idle' | 'subscribed'

const LS_KEY = 'push_subscribed'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushSubscribeButton() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    const saved = localStorage.getItem(LS_KEY)
    setState(saved === 'true' ? 'subscribed' : 'idle')
  }, [])

  async function handleSubscribe() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        setBusy(false)
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setBusy(false)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const sub = subscription.toJSON()
      await subscribePush({
        endpoint: sub.endpoint!,
        keys: {
          p256dh: sub.keys!.p256dh!,
          auth: sub.keys!.auth!,
        },
      })

      localStorage.setItem(LS_KEY, 'true')
      setState('subscribed')
    } catch {
      // Silent fail
    }
    setBusy(false)
  }

  async function handleUnsubscribe() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await unsubscribePush(subscription.endpoint)
        await subscription.unsubscribe()
      }
      localStorage.removeItem(LS_KEY)
      setState('idle')
    } catch {
      // Silent fail
    }
    setBusy(false)
  }

  if (state === 'loading' || state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-navy-800 bg-navy-900 px-3 py-2.5 text-[11px] text-navy-500">
        <BellOffIcon />
        <span>Notificaciones bloqueadas en tu navegador</span>
      </div>
    )
  }

  if (state === 'subscribed') {
    return (
      <button
        onClick={handleUnsubscribe}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-league-green/30 bg-league-green/10 px-3 py-2.5 text-[11px] font-semibold text-league-green transition-colors active:scale-[0.98] disabled:opacity-50"
      >
        <BellActiveIcon />
        <span>{busy ? 'Desactivando...' : 'Notificaciones activas'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy-700 bg-navy-800 px-3 py-2.5 text-[11px] font-semibold text-navy-300 transition-colors hover:text-white active:scale-[0.98] disabled:opacity-50"
    >
      <BellIcon />
      <span>{busy ? 'Activando...' : 'Activar notificaciones de goles'}</span>
    </button>
  )
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function BellActiveIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
    </svg>
  )
}

function BellOffIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667-1.372m-5.667 1.372c.07.137.14.273.214.408M17.25 15V9.75m0 0V9a6 6 0 00-3.832-5.589M17.25 9.75A8.966 8.966 0 0120.31 15.8M3 3l18 18" />
    </svg>
  )
}
