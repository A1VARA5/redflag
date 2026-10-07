// Red Flag's service worker does one job: catch something shared from the phone's share menu, keep it for a
// moment, and open the checker, which picks it up and starts the check. Every other request goes to the network
// as normal, and nothing is cached.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.origin !== self.location.origin || url.pathname !== '/share') return
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData()
        const cache = await caches.open('rf-share')
        const field = (name) => (typeof form.get(name) === 'string' ? form.get(name) : '')
        await cache.put('/shared/text', new Response(JSON.stringify({title: field('title'), text: field('text'), url: field('url')})))
        const file = form.getAll('file').find((f) => f && typeof f !== 'string')
        if (file) await cache.put('/shared/file', new Response(file, {headers: {'content-type': file.type || 'application/octet-stream', 'x-name': encodeURIComponent(file.name || 'shared')}}))
        else await cache.delete('/shared/file')
        return Response.redirect('/?shared=1#check', 303)
      } catch {
        return Response.redirect('/?shared=failed#check', 303)
      }
    })(),
  )
})
