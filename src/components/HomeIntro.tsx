'use client'

import {useState, useSyncExternalStore, type ReactNode} from 'react'
import dynamic from 'next/dynamic'
import {External} from './Icons'
import {DISCORD_INVITE} from '@/lib/public-links'

const FlagScene = dynamic(() => import('./FlagScene').then(m => m.FlagScene), {
  ssr: false,
  loading: () => <div className="flag-scene"><div className="flag-fallback" aria-hidden>red flag.</div></div>,
})

// The flag is only shown from 900px up (see .product-brand-art), so smaller screens never create the WebGL scene.
const WIDE = '(min-width: 900px)'
const subscribeWide = (onChange: () => void) => {
  const media = window.matchMedia(WIDE)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function HomeIntro({children}: {children: ReactNode}) {
  const [paused, setPaused] = useState(false)
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false)
  return (
    <section className="product-hero site-width" aria-labelledby="home-title">
      <div className="product-hero-grid">
        <div className="product-intro">
          <h1 id="home-title">Check it before<br /><span>you click.</span></h1>
          <p>Something feel off? Check a message, email, screenshot or PDF. See the warning signs, the evidence and what to do next.</p>
          <div className="product-intro-actions">
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="button button-outline">Add to Discord <External className="h-4 w-4" /></a>
            <a href="/how" className="text-link">How it works</a>
          </div>
          <div className="product-brand-art">
            {wide && <FlagScene paused={paused} />}
            <button className="art-motion" aria-pressed={paused} aria-label="Pause animation" onClick={() => setPaused(value => !value)}>
              <span aria-hidden>{paused ? '▷' : 'Ⅱ'}</span><span>{paused ? 'Play' : 'Pause'} animation</span>
            </button>
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}
