import type {Metadata, Viewport} from 'next'
import {Inter, Instrument_Serif, JetBrains_Mono, Caveat} from 'next/font/google'
import './globals.css'
import {Footer} from '@/components/Footer'

const inter = Inter({variable: '--font-inter', subsets: ['latin']})
const serif = Instrument_Serif({variable: '--font-serif', weight: '400', subsets: ['latin']})
const mono = JetBrains_Mono({variable: '--font-mono-jb', subsets: ['latin']})
const hand = Caveat({variable: '--font-hand', subsets: ['latin']})

const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: 'Red Flag: is this message a scam?',
  description: 'Paste it, screenshot it or forward it. Red Flag marks the exact words that give a scam away, checks every link without AI, and tells you what to do next.',
  openGraph: {title: 'Red Flag', description: 'Is this message a scam? Get a marked-up answer in seconds.', type: 'website'},
}

export const viewport: Viewport = {
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#f5f1e8'},
    {media: '(prefers-color-scheme: dark)', color: '#12100d'},
  ],
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${serif.variable} ${mono.variable} ${hand.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <Footer />
      </body>
    </html>
  )
}
