'use client'

import {useMemo, useState} from 'react'
import type {Verdict} from '@/lib/verdict'
import type {LinkReport} from '@/lib/links'
import {SITUATIONS, stepsFor, type Region, type Situation} from '@/lib/respond'

const LOOK = {
  scam: {word: 'Scam', sub: 'Do not reply, click or pay.', fg: 'text-red', bg: 'bg-red-wash', ring: 'border-red'},
  suspicious: {word: 'Suspicious', sub: 'Treat it as a scam until you have checked.', fg: 'text-amber', bg: 'bg-amber-wash', ring: 'border-amber'},
  unclear: {word: "Can't tell", sub: 'Not enough to go on. Check it the safe way below.', fg: 'text-slate', bg: 'bg-slate-wash', ring: 'border-slate'},
  safe: {word: 'No red flags found', sub: 'Nothing here looks like a scam. No checker can promise that, so stay alert.', fg: 'text-calm', bg: 'bg-calm-wash', ring: 'border-calm'},
} as const

const KIND: Record<string, string> = {
  urgency: 'Rush',
  secrecy: 'Secrecy',
  payment: 'Money',
  link: 'Link',
  impersonation: 'Pretending',
  too_good: 'Too good',
  personal_info: 'Your details',
  pressure: 'Pressure',
  mismatch: "Doesn't add up",
  odd_contact: 'Odd contact',
  other: 'Warning',
}

function Marked({text, highlights}: {text: string; highlights: Verdict['highlights']}) {
  const parts: React.ReactNode[] = []
  let at = 0
  highlights.forEach((h, i) => {
    if (h.start > at) parts.push(text.slice(at, h.start))
    parts.push(
      <mark key={i} className="pen bg-transparent text-inherit" style={{animationDelay: `${150 + i * 180}ms`}} title={h.why}>
        {text.slice(h.start, h.end)}
        <span className="pen-num">{i + 1}</span>
      </mark>,
    )
    at = h.end
  })
  if (at < text.length) parts.push(text.slice(at))
  return <p className="whitespace-pre-wrap break-words text-[17px] leading-8">{parts}</p>
}

const SEV = {high: 'bg-red text-white', medium: 'bg-amber text-white', low: 'bg-rule text-ink', info: 'bg-calm-wash text-calm'} as const

export function LinkPanel({links, pending}: {links: LinkReport[] | null; pending?: boolean}) {
  if (!links) {
    return (
      <div className="rounded-2xl border border-rule bg-sheet p-5">
        <Label>Link check</Label>
        <p className="mt-2 font-mono text-sm text-ink-3">Unwrapping redirects, looking up domain age, checking blocklists…</p>
      </div>
    )
  }
  return (
    <div className="rise rounded-2xl border border-rule bg-sheet p-5">
      <div className="flex items-baseline justify-between gap-3">
        <Label>Link check</Label>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">hard evidence · 566k blocklist · domain age · redirects</span>
      </div>
      {links.length === 0 && <p className="mt-2 text-sm text-ink-2">No links in this message.{pending ? ' Reading the words now.' : ''}</p>}
      <ul className="mt-3 space-y-4">
        {links.map((l) => (
          <li key={l.url} className="min-w-0">
            <div className="font-mono text-sm break-all">
              <span className="text-ink">{l.host || l.input}</span>
              {l.finalUrl && l.finalUrl !== l.url && (
                <span className="text-ink-3">
                  {' '}
                  → {safeHost(l.finalUrl)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-3">
              {l.ageDays !== null && <span>registered {l.registered} ({l.ageDays}d)</span>}
              {l.hops.length > 0 && <span>{l.hops.length} redirect{l.hops.length > 1 ? 's' : ''}</span>}
              {l.brand && <span>{l.official ? `real ${l.brand} domain` : `claims to be ${l.brand}`}</span>}
            </div>
            <ul className="mt-2 space-y-1.5">
              {l.flags.map((f) => (
                <li key={f.code} className="flex gap-2 text-sm leading-snug">
                  <span className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${SEV[f.severity]}`}>{f.severity}</span>
                  <span className="text-ink-2">{f.detail}</span>
                </li>
              ))}
              {l.flags.length === 0 && <li className="text-sm text-ink-3">Nothing unusual found about this link.</li>}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

function safeHost(u: string) {
  try {
    return new URL(u).hostname
  } catch {
    return u
  }
}

function Label({children}: {children: React.ReactNode}) {
  return <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{children}</h3>
}

export function VerdictView({v, sig, shared = false}: {v: Verdict; sig?: string; shared?: boolean}) {
  const look = LOOK[v.verdict]
  const [region, setRegion] = useState<Region>(v.region)
  const [situation, setSituation] = useState<Situation>(v.situation)
  const steps = useMemo(() => stepsFor(region, situation), [region, situation])
  const [copied, setCopied] = useState(false)
  // Margin notes follow the order the marks appear in the message; unmatched flags go last.
  const flags = v.red_flags
    .slice(0, 6)
    .map((f) => ({...f, n: v.highlights.findIndex((h) => h.why === f.why)}))
    .sort((a, b) => (a.n < 0 ? 99 : a.n) - (b.n < 0 ? 99 : b.n))

  async function share() {
    if (!shared) {
      const res = await fetch('/api/share', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({verdict: v, sig})})
      if (!res.ok) return
    }
    const url = `${location.origin}/v/${v.id}`
    const text = `I checked this message with Red Flag: ${look.word}. ${v.headline}`
    try {
      if (navigator.share) await navigator.share({title: 'Red Flag', text, url})
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  return (
    <section className="space-y-5">
      {/* Verdict */}
      <div className={`rise rounded-2xl border-2 ${look.ring} ${look.bg} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`stamp font-display text-5xl leading-none sm:text-6xl ${look.fg}`}>{look.word}</div>
          {(v.verdict === 'scam' || v.verdict === 'suspicious') && (
            <div className="font-mono text-xs text-ink-2">
              <span className="text-2xl font-semibold text-ink tabular-nums">{v.confidence}</span>% sure
            </div>
          )}
        </div>
        <p className="mt-3 text-xl font-semibold leading-snug">{v.headline}</p>
        <p className="mt-1 text-sm text-ink-2">{look.sub}</p>
        {v.overrides.length > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-ink-3 px-3 py-2 text-sm text-ink-2">
            <span className="font-semibold text-ink">Checks overruled the AI: </span>
            {v.overrides.join(' ')}
          </div>
        )}
      </div>

      {/* The marked-up message */}
      <div className="rise grid gap-5 lg:grid-cols-[1fr_300px]" style={{animationDelay: '80ms'}}>
        <div className="relative rounded-2xl border border-rule bg-sheet p-5 shadow-[0_1px_0_var(--rule),0_12px_30px_-18px_rgba(0,0,0,0.25)] sm:p-7">
          <div className="mb-3 flex items-center justify-between">
            <Label>{v.inputHadImage ? 'Text read from your screenshot' : 'The message'}</Label>
            {v.impersonating && <span className="rounded-full bg-red-wash px-2.5 py-0.5 text-xs font-medium text-red">pretending to be {v.impersonating}</span>}
          </div>
          <Marked text={v.text} highlights={v.highlights} />
        </div>
        <ol className="space-y-3">
          {flags.length === 0 && <li className="text-sm text-ink-2">No warning signs marked.</li>}
          {flags.map((f, i) => {
            const n = f.n
            return (
              <li key={i} className="rise flex gap-3" style={{animationDelay: `${200 + i * 120}ms`}}>
                <span className="font-hand text-3xl leading-6 text-red">{n >= 0 ? n + 1 : '•'}</span>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-red">{KIND[f.kind] ?? f.kind}</div>
                  <p className="font-hand text-[22px] leading-6 text-ink">{f.why}</p>
                </div>
              </li>
            )
          })}
          {v.good_signs.length > 0 && (
            <li className="pt-2">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-calm">In its favour</div>
              <ul className="mt-1 space-y-1 text-sm text-ink-2">
                {v.good_signs.map((g, i) => (
                  <li key={i}>+ {g}</li>
                ))}
              </ul>
            </li>
          )}
        </ol>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* What it is */}
        <div className="rise rounded-2xl border border-rule bg-sheet p-5" style={{animationDelay: '160ms'}}>
          <Label>What's going on</Label>
          {v.pattern && <div className="mt-2 font-display text-3xl leading-tight">{v.pattern.name}</div>}
          {v.trending && (
            <a href="/radar" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red px-2.5 py-0.5 text-xs font-semibold text-white">
              ● {v.trending.status === 'new' ? 'New this week' : v.trending.status === 'rising' ? 'Rising this week' : 'Doing the rounds this week'}
            </a>
          )}
          <p className="mt-2 leading-relaxed text-ink-2">{v.summary}</p>
          {v.pattern?.aiAngle && <p className="mt-2 text-sm text-ink-2"><span className="font-semibold text-ink">Why it's getting worse: </span>{v.pattern.aiAngle}</p>}
          {v.pattern && v.pattern.sources.length > 0 && (
            <div className="mt-3 border-t border-rule pt-3">
              <div className="text-xs text-ink-3">Official warnings about this scam</div>
              <ul className="mt-1 space-y-1">
                {v.pattern.sources.map((s) => (
                  <li key={s.url}>
                    <a className="text-sm underline decoration-rule underline-offset-4 hover:decoration-ink" href={s.url} target="_blank" rel="noreferrer">
                      {s.publisher}: {s.title} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-paper p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">Check it yourself, safely</div>
            <p className="mt-1 font-medium">{v.check_it_yourself}</p>
          </div>
        </div>

        <LinkPanel links={v.links} />
      </div>

      {/* What to do */}
      {v.verdict !== 'safe' && (
        <div className="rise rounded-2xl bg-ink p-5 text-paper sm:p-6" style={{animationDelay: '240ms'}}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-3xl">What to do now</h3>
            <div className="flex gap-1 rounded-full bg-white/10 p-1 text-xs">
              {(['UK', 'US', 'EU'] as Region[]).map((r) => (
                <button key={r} onClick={() => setRegion(r)} className={`rounded-full px-3 py-1 ${region === r ? 'bg-paper text-ink' : 'text-paper/80'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSituation(s.id)}
                className={`rounded-full border px-3 py-1 text-sm ${situation === s.id ? 'border-paper bg-paper text-ink' : 'border-white/25 text-paper/85 hover:border-white/60'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <ol className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-sm text-paper/50">{String(i + 1).padStart(2, '0')}</span>
                <span className="leading-snug">
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-white/40 underline-offset-4">
                      {s.text}
                    </a>
                  ) : (
                    s.text
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-ink-3">
        <span className="font-mono">
          {v.model} · {(v.ms / 1000).toFixed(1)}s · {new Date(v.createdAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'})}
          {shared ? ' · shared verdict, signed by Red Flag' : ' · not saved unless you share it'}
        </span>
        <button onClick={share} className="rounded-full border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-paper">
          {copied ? 'Link copied' : 'Send this to someone'}
        </button>
      </div>
    </section>
  )
}
