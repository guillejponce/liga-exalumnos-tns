self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: '/assets/LNS negro.png',
    badge: '/assets/LNS negro.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'liga-update',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Liga Nico Sabag', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
