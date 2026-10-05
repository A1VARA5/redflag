'use client'

import {useEffect, useRef, useState} from 'react'
import type {LinkReport} from '@/lib/links'
import {Link as LinkIcon, ShieldAlert, ShieldCheck, ShieldX, Spinner} from './Icons'

// Checks links the moment they appear in the box, before the full check runs.
export function LiveLinks({text}: {text: string}) {
  const [links, setLinks] = useState<LinkReport[] | null>(null)
  const [loading, setLoading] = useState(false)
  const last = useRef('')

  useEffect(() => {
    const hasLink = /https?:\/\/|hxxps?:\/\/|\b[a-z0-9-]+\.(com|co\.uk|uk|net|org|info|top|xyz|io|app|link|me|site|online|shop|click|live|ly|gd)\b/i.test(text)
    if (!hasLink) {
      setLinks(null)
      last.current = ''
      return
    }
    const t = setTimeout(async () => {
      if (text === last.current) return
      last.current = text
      setLoading(true)
      try {
        const res = await fetch('/api/links', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text})})
        if (res.ok) setLinks((await res.json()).links)
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [text])

  if (!loading && (!links || links.length === 0)) return null
  return (
    <div className="mt-3 rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <LinkIcon className="h-4 w-4 text-navy" /> Link check
        {loading && <Spinner className="h-4 w-4 text-ink-3" />}
        <span className="font-normal text-ink-3">· instant, before the full check</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {(links ?? []).map((l) => {
          const high = l.flags.filter((f) => f.severity === 'high')
          const medium = l.flags.filter((f) => f.severity === 'medium')
          const state = high.length ? 'danger' : medium.length ? 'warn' : l.official ? 'ok' : 'none'
          const Icon = state === 'danger' ? ShieldX : state === 'warn' ? ShieldAlert : ShieldCheck
          const colour = state === 'danger' ? 'text-danger' : state === 'warn' ? 'text-warn' : state === 'ok' ? 'text-safe' : 'text-ink-3'
          const top = high[0] ?? medium[0] ?? l.flags.find((f) => f.code === 'official-domain')
          return (
            <li key={l.url} className="flex items-start gap-2.5">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colour}`} />
              <div className="min-w-0">
                <div className="break-all font-mono text-[14px] text-ink">{l.host}</div>
                <div className={`text-[14px] leading-snug ${state === 'danger' ? 'text-danger' : 'text-ink-2'}`}>
                  {top ? top.detail : 'Nothing known against this link. Run the full check to read the message too.'}
                  {high.length + medium.length > 1 && <span className="text-ink-3"> (+{high.length + medium.length - 1} more)</span>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
