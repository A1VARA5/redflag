'use client'

// "On your phone": installing Red Flag puts it in Android's share menu. The Install button only appears when the
// browser offers it; otherwise the card says how to add it by hand. Hidden when Red Flag is already installed.
import {useEffect, useState, useSyncExternalStore} from 'react'
import {Phone} from './Icons'

type InstallPrompt = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>}

const standalone = {
  subscribe: (cb: () => void) => {
    const m = window.matchMedia('(display-mode: standalone)')
    m.addEventListener('change', cb)
    return () => m.removeEventListener('change', cb)
  },
  get: () => window.matchMedia('(display-mode: standalone)').matches,
}

export function InstallApp() {
  const installed = useSyncExternalStore(standalone.subscribe, standalone.get, () => false)
  const [offer, setOffer] = useState<InstallPrompt | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onOffer = (e: Event) => {
      e.preventDefault()
      setOffer(e as InstallPrompt)
    }
    const onInstalled = () => setDone(true)
    window.addEventListener('beforeinstallprompt', onOffer)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onOffer)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  return (
    <article className="install-card">
      <div>
        <div className="channel-heading"><Phone className="h-6 w-6" /><h3>Check it straight from your phone.</h3></div>
        <p>Add Red Flag to your home screen. On Android it then shows up when you tap Share on a message or a screenshot, so a check is two taps away.</p>
        <p className="install-how">Android: tap Install, or open the browser menu and choose Add to Home screen. iPhone: in Safari, tap Share, then Add to Home Screen. iPhones don&apos;t let web apps receive shares yet, so paste the message in.</p>
      </div>
      {done ? (
        <p className="install-done" role="status">Installed. Look for Red Flag in your share menu.</p>
      ) : offer ? (
        <button
          type="button"
          className="button button-red"
          onClick={async () => {
            await offer.prompt()
            const {outcome} = await offer.userChoice
            if (outcome === 'accepted') setDone(true)
            setOffer(null)
          }}
        >
          Install Red Flag
        </button>
      ) : null}
    </article>
  )
}
