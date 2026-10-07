import type {Metadata, Viewport} from 'next'
import localFont from 'next/font/local'
import {IBM_Plex_Mono} from 'next/font/google'
import './globals.css'
import {Header} from '@/components/Header'
import {Footer} from '@/components/Footer'

const plex = localFont({variable: '--font-plex', display: 'swap', src: [
  {path: '../../public/fonts/geist-300.ttf', weight: '300'},
  {path: '../../public/fonts/geist-400.ttf', weight: '400'},
  {path: '../../public/fonts/geist-500.ttf', weight: '500'},
  {path: '../../public/fonts/geist-600.ttf', weight: '600'},
]})
const plexMono = IBM_Plex_Mono({variable: '--font-plex-mono', weight: ['400', '500'], subsets: ['latin']})

const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: 'Red Flag: check a message before you click',
  description: 'Check an email, message, screenshot or PDF. Red Flag shows the exact words that give a scam away, checks every link against Google Safe Browsing and over 550,000 known phishing sites, and tells you what to do next.',
  openGraph: {title: 'Red Flag', description: 'Check a message before you click.', type: 'website'},
}

export const viewport: Viewport = {
  themeColor: [
    {color: '#101c26'},
  ],
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en-GB" data-theme="dark" data-scroll-behavior="smooth" className={`${plex.variable} ${plexMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Header />
        <div id="main-content" className="flex-1" tabIndex={-1}>{children}</div>
        <Footer />
      </body>
    </html>
  )
}
