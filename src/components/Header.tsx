'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useEffect, useState} from 'react'
import {Flag} from './Flag'

const DISCORD = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_APPLICATION_ID ?? '1556639934457184256'}`

// Sticky header. On the home page it sits see-through on the navy hero and turns solid once you scroll.
export function Header() {
  const home = usePathname() === '/'
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, {passive: true})
    return () => window.removeEventListener('scroll', on)
  }, [])
  const dark = home && !scrolled

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        dark ? 'border-b border-white/10 bg-[#071526]' : 'border-b border-line bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/75'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className={`flex items-center gap-2.5 text-[17px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
          <Flag />
          Red Flag
        </Link>
        <nav className={`flex items-center gap-1 text-[15px] sm:gap-2 ${dark ? 'text-white/75' : 'text-ink-2'}`}>
          <Link href="/radar" className={`hidden rounded-md px-2.5 py-1.5 md:block ${dark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-muted-bg hover:text-ink'}`}>
            This week&apos;s scams
          </Link>
          <Link href="/how" className={`hidden rounded-md px-2.5 py-1.5 lg:block ${dark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-muted-bg hover:text-ink'}`}>
            How it works
          </Link>
          <Link href="/eval" className={`hidden rounded-md px-2.5 py-1.5 lg:block ${dark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-muted-bg hover:text-ink'}`}>
            Test results
          </Link>
          <a
            href={DISCORD}
            target="_blank"
            rel="noreferrer"
            className={`ml-1 hidden rounded-lg px-3 py-1.5 font-medium sm:block ${dark ? 'border border-white/25 text-white hover:bg-white/10' : 'border border-line-2 text-ink hover:border-ink'}`}
          >
            Add to Discord
          </a>
          <Link href="/#check" className={`ml-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold ${dark ? 'bg-white text-[#0f2a47] hover:bg-white/90' : 'bg-navy text-white hover:bg-navy-2'}`}>
            Check a message
          </Link>
        </nav>
      </div>
    </header>
  )
}
