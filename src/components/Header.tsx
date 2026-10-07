'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useState} from 'react'
import {Flag} from './Flag'
import {Arrow, External} from './Icons'
import {DISCORD_INVITE} from '@/lib/public-links'

const pages = [
  {href: '/radar', label: 'Scam radar'},
  {href: '/how', label: 'How it works'},
  {href: '/eval', label: 'Test results'},
]

export function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header" onKeyDown={e => {if (open && e.key === 'Escape') {setOpen(false); document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus()}}}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="site-width header-inner">
        <Link href="/" className="brand" onClick={() => {
          setOpen(false)
          if (pathname === '/') window.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
        }}><Flag size={32} />Red Flag<span className="brand-period">.</span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {pages.map((p) => <Link key={p.href} href={p.href} aria-current={pathname === p.href ? 'page' : undefined}>{p.label}</Link>)}
        </nav>
        <div className="header-actions">
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="header-discord">Add to Discord <External className="h-4 w-4" /></a>
          <Link href="/#check" className="button button-small button-ink" onClick={() => setOpen(false)}>Check<span className="header-check-detail"> for scams</span><span className="header-check-short"> now</span> <Arrow className="h-4 w-4" /></Link>
          <button className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
            <span aria-hidden>{open ? '×' : '☰'}</span>
          </button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
        {pages.map((p) => <Link key={p.href} href={p.href} aria-current={pathname === p.href ? 'page' : undefined} onClick={() => setOpen(false)}>{p.label}<Arrow className="h-4 w-4" /></Link>)}
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Add to Discord <External className="h-4 w-4" /></a>
      </nav>}
    </header>
  )
}
