'use client'

import {useEffect, useState} from 'react'
import type {Scan} from '@/lib/urlscan'
import {External, Spinner} from './Icons'

// Screenshot of the linked page, taken in urlscan.io's sandbox so nobody has to open it themselves.
export function ScanShot({scan, host}: {scan: Scan; host: string}) {
  const [ready, setReady] = useState(!scan.pending)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (ready) return
    let tries = 0
    const t = setInterval(async () => {
      tries++
      try {
        const r = await fetch(`/api/scan/${scan.uuid}`)
        if (r.ok && (await r.json()).ready) {
          setReady(true)
          clearInterval(t)
        }
      } catch {}
      if (tries > 20) {
        setFailed(true)
        clearInterval(t)
      }
    }, 4000)
    return () => clearInterval(t)
  }, [ready, scan.uuid])

  if (failed) return null
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-3">
        <span>What the page looks like (opened safely in a sandbox{scan.reused && scan.time ? `, ${scan.time}` : ''})</span>
        <a href={scan.page} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 hover:text-navy">
          urlscan.io <External className="h-3 w-3" />
        </a>
      </div>
      {ready ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/scan/${scan.uuid}?img=1`}
          alt={`Screenshot of ${host}`}
          onError={() => setFailed(true)}
          className="mt-1.5 max-h-80 w-full rounded-lg border border-line object-cover object-top"
        />
      ) : (
        <div className="mt-1.5 flex h-28 items-center justify-center gap-2 rounded-lg border border-dashed border-line-2 text-[14px] text-ink-3">
          <Spinner className="h-4 w-4" /> Opening the page in a sandbox…
        </div>
      )}
    </div>
  )
}
