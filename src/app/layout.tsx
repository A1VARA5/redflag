import type {Metadata, Viewport} from 'next'
import {IBM_Plex_Sans, IBM_Plex_Mono} from 'next/font/google'
import './globals.css'
import {Header} from '@/components/Header'
import {Footer} from '@/components/Footer'

const plex = IBM_Plex_Sans({variable: '--font-plex', weight: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext']})
const plexMono = IBM_Plex_Mono({variable: '--font-plex-mono', weight: ['400', '500'], subsets: ['latin']})

const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: 'Red Flag: check a message before you click',
  description: 'Paste a text, email or screenshot. Red Flag shows the exact words that give a scam away, checks every link against Google Safe Browsing and 566,000 known phishing sites, and tells you what to do next.',
  openGraph: {title: 'Red Flag', description: 'Check a message before you click.', type: 'website'},
}

export const viewport: Viewport = {
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#f6f7f9'},
    {media: '(prefers-color-scheme: dark)', color: '#0b1220'},
  ],
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en-GB" className={`${plex.variable} ${plexMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
