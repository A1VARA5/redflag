'use client'

import {useMemo, useState} from 'react'
import type {Verdict} from '@/lib/verdict'
import type {LinkReport} from '@/lib/links'
import {SITUATIONS, respondFor, type Region, type Situation} from '@/lib/respond'
import {External, ShieldAlert, ShieldCheck, ShieldQ, ShieldX} from './Icons'
import {ScanShot} from './ScanShot'

const LOOK = {
  scam: {title: 'This is a scam', sub: "Don't reply, click or pay.", Icon: ShieldX, fg: 'text-danger', bg: 'bg-danger-bg', line: 'border-danger-line', solid: 'bg-danger'},
  suspicious: {title: 'This looks suspicious', sub: 'Treat it as a scam until you have checked it yourself.', Icon: ShieldAlert, fg: 'text-warn', bg: 'bg-warn-bg', line: 'border-warn-line', solid: 'bg-warn'},
  unclear: {title: "We can't tell", sub: "There isn't enough to go on. Check it the safe way below.", Icon: ShieldQ, fg: 'text-ink-2', bg: 'bg-muted-bg', line: 'border-line-2', solid: 'bg-ink-2'},
  safe: {title: 'No red flags found', sub: 'Nothing here looks like a scam. No checker can promise that, so stay alert.', Icon: ShieldCheck, fg: 'text-safe', bg: 'bg-safe-bg', line: 'border-safe-line', solid: 'bg-safe'},
} as const

const KIND: Record<string, string> = {
  urgency: 'Rushing you',
  secrecy: 'Asking for secrecy',
  payment: 'Asking for money',
  link: 'Suspicious link',
  impersonation: 'Pretending to be someone',
  too_good: 'Too good to be true',
  personal_info: 'Asking for your details',
  pressure: 'Pressure or threats',
  mismatch: "Doesn't add up",
  odd_contact: 'Unexpected contact',
  other: 'Warning sign',
}

function Marked({text, highlights}: {text: string; highlights: Verdict['highlights']}) {
  const parts: React.ReactNode[] = []
  let at = 0
  highlights.forEach((h, i) => {
    if (h.start > at) parts.push(text.slice(at, h.start))
    parts.push(
      <mark key={i} className="flagged text-inherit" title={h.why}>
        {text.slice(h.start, h.end)}
        <span className="flag-n">{i + 1}</span>
      </mark>,
    )
    at = h.end
  })
  if (at < text.length) parts.push(text.slice(at))
  return <p className="whitespace-pre-wrap break-words text-[17px] leading-8 text-ink">{parts}</p>
}

const SEV = {
  high: {label: 'Danger', cls: 'bg-danger-bg text-danger border-danger-line'},
  medium: {label: 'Warning', cls: 'bg-warn-bg text-warn border-warn-line'},
  low: {label: 'Note', cls: 'bg-muted-bg text-ink-2 border-line-2'},
  info: {label: 'OK', cls: 'bg-safe-bg text-safe border-safe-line'},
} as const

function safeHost(u: string) {
  try {
    return new URL(u).hostname
  } catch {
    return u
  }
}

export function LinkPanel({links}: {links: LinkReport[]}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Link checks</h3>
      <p className="mt-1 text-sm text-ink-3">Google Safe Browsing, VirusTotal, 566,000 known phishing sites, domain age, look-alike brand names and redirects. Plain code, not AI.</p>
      {links.length === 0 && <p className="mt-4 text-[15px] text-ink-2">There are no links in this message.</p>}
      <ul className="mt-4 divide-y divide-line">
        {links.map((l) => (
          <li key={l.url} className="min-w-0 py-3 first:pt-0 last:pb-0">
            <div className="break-all font-mono text-[14px] text-ink">
              {l.host || l.input}
              {l.finalUrl && l.finalUrl !== l.url && <span className="text-ink-3"> → {safeHost(l.finalUrl)}</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-ink-3">
              {l.registered && <span>Registered {l.registered}</span>}
              {l.brand && <span>{l.official ? `Real ${l.brand} address` : `Uses the name ${l.brand}`}</span>}
            </div>
            <ul className="mt-2 space-y-1.5">
              {l.flags.map((f) => (
                <li key={f.code} className="flex items-start gap-2 text-[14px] leading-snug">
                  <span className={`mt-px shrink-0 rounded border px-1.5 py-px text-[11px] font-semibold ${SEV[f.severity].cls}`}>{SEV[f.severity].label}</span>
                  <span className="text-ink-2">{f.detail}</span>
                </li>
              ))}
              {l.flags.length === 0 && <li className="text-[14px] text-ink-3">Nothing unusual found about this link.</li>}
            </ul>
            {l.vt && (
              <a href={l.vt.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-navy">
                VirusTotal: {l.vt.malicious + l.vt.suspicious} of {l.vt.total} engines flag it{l.vt.scannedAt ? `, last scanned ${l.vt.scannedAt}` : ''} <External className="h-3 w-3" />
              </a>
            )}
            {l.scan && <ScanShot scan={l.scan} host={l.host} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function VerdictView({v, sig, shared = false, image}: {v: Verdict; sig?: string; shared?: boolean; image?: string}) {
  const look = LOOK[v.verdict]
  const [region, setRegion] = useState<Region>(v.region)
  const [situation, setSituation] = useState<Situation>(v.situation)
  const {steps, report} = useMemo(
    () => respondFor(region, situation, {text: v.text, impersonating: v.impersonating, pattern: v.pattern_id, source: v.source, hasLinks: v.links.length > 0, verdict: v.verdict, country: v.country ?? null}),
    [region, situation, v],
  )
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle')
  const flags = v.red_flags
    .slice(0, 6)
    .map((f) => ({...f, n: v.highlights.findIndex((h) => h.why === f.why)}))
    .sort((a, b) => (a.n < 0 ? 99 : a.n) - (b.n < 0 ? 99 : b.n))

  async function share() {
    try {
      if (!shared) {
        const res = await fetch('/api/share', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({verdict: v, sig})})
        if (!res.ok) throw new Error()
      }
      const url = `${location.origin}/v/${v.id}`
      const text = `I checked this message with Red Flag: ${look.title}. ${v.headline}`
      if (navigator.share) await navigator.share({title: 'Red Flag', text, url})
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2500)
      }
    } catch {
      setShareState('error')
    }
  }

  return (
    <section className="fade-in space-y-5">
      {/* Verdict */}
      <div className={`rounded-xl border ${look.line} ${look.bg} p-5 sm:p-6`}>
        <div className="flex items-start gap-4">
          <look.Icon className={`h-11 w-11 shrink-0 ${look.fg}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className={`text-2xl font-bold tracking-tight sm:text-[28px] ${look.fg}`}>{look.title}</h2>
              {(v.verdict === 'scam' || v.verdict === 'suspicious') && <span className="text-sm font-medium text-ink-2">{v.confidence}% confident</span>}
            </div>
            <p className="mt-1.5 text-[17px] font-medium text-ink">{v.headline}</p>
            <p className="mt-1 text-[15px] text-ink-2">{look.sub}</p>
          </div>
        </div>
        {v.overrides.length > 0 && (
          <div className="mt-4 rounded-lg border border-line-2 bg-card px-4 py-3 text-[14px] text-ink-2">
            <span className="font-semibold text-ink">Our link checks overruled the AI. </span>
            {v.overrides.join(' ')}
          </div>
        )}
      </div>

      {/* Message and warning signs */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{v.inputHadImage ? 'Text from your screenshot' : 'Your message'}</h3>
            {v.impersonating && <span className="rounded-md border border-danger-line bg-danger-bg px-2 py-0.5 text-[13px] font-medium text-danger">Pretending to be {v.impersonating}</span>}
          </div>
          {v.truncated && (
            <p className="mt-2 text-[14px] text-ink-3">This is a long message. Every link in it was checked; the AI read the beginning and the end, where scams usually put the request.</p>
          )}
          <div className={`mt-4 ${image ? 'grid gap-5 sm:grid-cols-[minmax(0,1fr)_140px]' : ''}`}>
            <Marked text={v.text} highlights={v.highlights} />
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Your screenshot" className="hidden max-h-72 w-full rounded-lg border border-line object-contain object-top sm:block" />
            )}
          </div>
        </section>
        <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold">{flags.length ? `${flags.length} warning sign${flags.length > 1 ? 's' : ''}` : 'Warning signs'}</h3>
          {flags.length === 0 && <p className="mt-3 text-[15px] text-ink-2">None found.</p>}
          <ol className="mt-4 space-y-4">
            {flags.map((f, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-[12px] font-bold text-white">{f.n >= 0 ? f.n + 1 : '•'}</span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{KIND[f.kind] ?? 'Warning sign'}</div>
                  <p className="text-[14px] leading-snug text-ink-2">{f.why}</p>
                </div>
              </li>
            ))}
          </ol>
          {v.good_signs.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-[14px] font-semibold text-safe">In its favour</div>
              <ul className="mt-1.5 space-y-1 text-[14px] text-ink-2">
                {v.good_signs.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className={`grid gap-5 ${v.links.length ? 'lg:grid-cols-2' : ''}`}>
        <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold">{v.pattern ? v.pattern.name : "What's going on"}</h3>
          {v.trending && (
            <a href="/radar" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-danger-bg px-2 py-0.5 text-[13px] font-medium text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              {v.trending.status === 'new' ? 'New this week' : v.trending.status === 'rising' ? 'Rising this week' : 'Going around this week'}
            </a>
          )}
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{v.summary}</p>
          {v.pattern?.aiAngle && (
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
              <span className="font-semibold text-ink">Why it's getting harder to spot: </span>
              {v.pattern.aiAngle}
            </p>
          )}
          <div className="mt-4 rounded-lg bg-muted-bg p-4">
            <div className="text-[13px] font-semibold text-ink-2">Check it yourself, safely</div>
            <p className="mt-1 text-[15px] font-medium text-ink">{v.check_it_yourself}</p>
          </div>
          {v.pattern && v.pattern.sources.length > 0 && (
            <div className="mt-4">
              <div className="text-[13px] font-semibold text-ink-2">Official warnings about this scam</div>
              <ul className="mt-1.5 space-y-1">
                {v.pattern.sources.map((s) => (
                  <li key={s.url}>
                    <a className="text-[14px] text-navy underline decoration-line-2 underline-offset-4 hover:decoration-navy" href={s.url} target="_blank" rel="noreferrer">
                      {s.publisher}: {s.title}
                      <External className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {v.links.length > 0 && <LinkPanel links={v.links} />}
      </div>
      {v.links.length === 0 && <p className="-mt-2 px-1 text-[14px] text-ink-3">No links in this message, so there was nothing to check against Google Safe Browsing or the phishing lists.</p>}

      {v.verdict !== 'safe' && (
        <section className="rounded-xl bg-navy p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">What to do now</h3>
            <div className="flex rounded-lg bg-white/10 p-0.5 text-[13px] font-medium">
              {(['UK', 'US', 'EU'] as Region[]).map((r) => (
                <button key={r} onClick={() => setRegion(r)} className={`rounded-md px-3 py-1 ${region === r ? 'bg-white text-navy' : 'text-white/80 hover:text-white'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSituation(s.id)}
                className={`rounded-lg border px-3 py-1.5 text-[14px] font-medium ${situation === s.id ? 'border-white bg-white text-navy' : 'border-white/25 text-white/85 hover:border-white/60'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <ol className="mt-5 space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[16px] leading-snug">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          {report.length > 0 && (
            <>
              <div className="mt-6 text-[14px] font-semibold text-white/70">Report it</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {report.map((c) => (
                  <a key={c.id} href={c.url} target="_blank" rel="noreferrer" className="group rounded-lg border border-white/20 p-3.5 hover:border-white/60 hover:bg-white/5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {c.name} <External className="h-3.5 w-3.5 opacity-70" />
                    </div>
                    <div className="mt-0.5 text-[14px] leading-snug text-white/75">{c.how}</div>
                  </a>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-5 py-4">
        <div className="text-[15px] text-ink-2">
          {shared ? 'This result was shared with you. It is signed by Red Flag, so it hasn\'t been edited.' : 'Know someone who would fall for this? Send them the result.'}
        </div>
        <button onClick={share} className="rounded-lg bg-navy px-4 py-2 text-[15px] font-semibold text-white hover:bg-navy-2">
          {shareState === 'copied' ? 'Link copied' : shareState === 'error' ? 'Try again' : shared ? 'Share again' : 'Share the result'}
        </button>
      </div>
      <p className="text-[13px] text-ink-3">
        Checked {new Date(v.createdAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'})} in {(v.ms / 1000).toFixed(1)}s, read by{' '}
        {v.engine === 'backup' ? 'the backup model (Qwen3-VL, open source, on Featherless)' : 'Claude (Anthropic)'}.{shared ? '' : ' Not stored unless you share it.'}
      </p>
    </section>
  )
}
