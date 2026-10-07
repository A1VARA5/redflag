import type {MetadataRoute} from 'next'

// Installable on phones. On Android, an installed Red Flag shows up in the share menu, so a message or
// screenshot goes straight into a check (the service worker in public/sw.js catches the share).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Red Flag',
    short_name: 'Red Flag',
    description: 'Check a message before you click.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#101c26',
    theme_color: '#101c26',
    icons: [
      {src: '/icon-192.png', sizes: '192x192', type: 'image/png'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png'},
      {src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
    share_target: {
      action: '/share',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {title: 'title', text: 'text', url: 'url', files: [{name: 'file', accept: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', '.pdf']}]},
    },
  }
}
