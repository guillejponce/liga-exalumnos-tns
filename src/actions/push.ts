'use server'

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'mailto:peloteros-newland@gmail.com'

  if (!publicKey || !privateKey) return null

  return { publicKey, privateKey, email }
}

export async function subscribePush(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  teamId?: string | null
}) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys.p256dh,
      keys_auth: subscription.keys.auth,
      team_id: subscription.teamId || null,
    },
    { onConflict: 'endpoint' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

export async function unsubscribePush(endpoint: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) return { error: error.message }
  return { success: true }
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushForMatch(payload: PushPayload, teamIds: string[]) {
  const vapid = getVapidConfig()
  if (!vapid) return

  webpush.setVapidDetails(vapid.email, vapid.publicKey, vapid.privateKey)

  const supabase = createAdminClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth, team_id')

  if (!subs || subs.length === 0) return

  const relevantSubs = subs.filter(
    (sub) => !sub.team_id || teamIds.includes(sub.team_id)
  )

  if (relevantSubs.length === 0) return

  const body = JSON.stringify(payload)
  const expiredIds: string[] = []

  await Promise.allSettled(
    relevantSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          body
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id)
        }
      }
    })
  )

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }
}
