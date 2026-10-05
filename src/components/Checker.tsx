'use client'

import {useEffect, useRef, useState} from 'react'
import type {Verdict} from '@/lib/verdict'
import type {LinkReport} from '@/lib/links'
import {SAMPLES} from '@/lib/samples'
import {LinkPanel, VerdictView} from './VerdictView'

type Img = {mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; data: string; preview: string}
type Phase = 'idle' | 'checking' | 'done' | 'error'

const STAGES = ['AI reading the message', 'Hard checks on every link', 'Comparing with 30 known scams', 'Marking it up']

async function fileToImg(file: File): Promise<Img | null> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return null
  if (file.size > 4 * 1024 * 1024) {
    // Downscale big phone screenshots so they fit the limit.
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    const url = c.toDataURL('image/jpeg', 0.85)
    return {mediaType: 'image/jpeg', data: url.split(',')[1], preview: url}
  }
  const url = await new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.readAsDataURL(file)
  })
  return {mediaType: file.type as Img['mediaType'], data: url.split(',')[1], preview: url}
}

export function Checker() {
  const [text, setText] = useState('')
  const [img, setImg] = useState<Img | null>(null)
  const [region, setRegion] = useState<'UK' | 'US' | 'EU'>('UK')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stage, setStage] = useState(0)
  const [links, setLinks] = useState<LinkReport[] | null>(null)
  const [result, setResult] = useState<{v: Verdict; sig: string} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const r = localStorage.getItem('rf-region')
      if (r === 'UK' || r === 'US' || r === 'EU') setRegion(r)
      else if (Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('America')) setRegion('US')
    } catch {}
  }, [])

  // Paste a screenshot straight from the clipboard anywhere on the page.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        setImg(await fileToImg(file))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  useEffect(() => {
    if (phase !== 'checking') return
    setStage(0)
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1700)
    return () => clearInterval(t)
  }, [phase])

  async function runSampleImage() {
    const blob = await (await fetch('/sample-sms')).blob()
    const sample = await fileToImg(new File([blob], 'sample.png', {type: 'image/png'}))
    if (!sample) return
    setText('')
    setImg(sample)
    run(undefined, sample)
  }

  async function run(override?: string, imgOverride?: Img) {
    const useImg = imgOverride ?? (override !== undefined ? null : img)
    const body = {text: override ?? (imgOverride ? '' : text), image: useImg ? {mediaType: useImg.mediaType, data: useImg.data} : null, region}
    if (!body.text.trim() && !body.image) return
    if (override !== undefined && !imgOverride) {
      setText(override)
      setImg(null)
    }
    try {
      localStorage.setItem('rf-region', region)
    } catch {}
    setPhase('checking')
    setLinks(null)
    setResult(null)
    setError(null)
    setTimeout(() => resultRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}), 50)
    try {
      const res = await fetch('/api/check', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)})
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${res.status}`)
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const {done, value} = await reader.read()
        if (done) break
        buf += dec.decode(value, {stream: true})
        let nl
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl)
          buf = buf.slice(nl + 1)
          if (!line.trim()) continue
          const ev = JSON.parse(line)
          if (ev.type === 'links') {
            setLinks(ev.links)
            setStage((s) => Math.max(s, 2))
          } else if (ev.type === 'verdict') {
            setResult({v: ev.verdict, sig: ev.sig})
            setPhase('done')
          } else if (ev.type === 'error') throw new Error(ev.error)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setPhase('error')
    }
  }

  const busy = phase === 'checking'

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files[0]
          if (f) setImg(await fileToImg(f))
        }}
        className={`rounded-2xl border-2 bg-sheet p-3 transition-colors sm:p-4 ${drag ? 'border-red' : 'border-ink'} ${busy ? 'scan' : ''}`}
      >
        <label htmlFor="msg" className="sr-only">
          The message you are unsure about
        </label>
        <textarea
          id="msg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
          }}
          rows={5}
          placeholder="Paste the text, email or DM here. Or drop / paste a screenshot."
          className="w-full resize-y bg-transparent p-2 text-[17px] leading-7 outline-none placeholder:text-ink-3"
        />
        {img && (
          <div className="mx-2 mb-2 flex items-center gap-3 rounded-xl bg-paper p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.preview} alt="Your screenshot" className="h-16 w-16 rounded-lg object-cover" />
            <span className="text-sm text-ink-2">Screenshot added. Red Flag will read it.</span>
            <button onClick={() => setImg(null)} className="ml-auto px-2 text-sm text-ink-3 hover:text-ink">
              Remove
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-rule px-1 pt-3">
          <button onClick={() => fileRef.current?.click()} className="rounded-full border border-rule px-3 py-2 text-sm text-ink-2 hover:border-ink hover:text-ink">
            + Screenshot
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) setImg(await fileToImg(f))
              e.target.value = ''
            }}
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as typeof region)}
            aria-label="Where you live"
            className="rounded-full border border-rule bg-transparent px-3 py-2 text-sm text-ink-2"
          >
            <option value="UK">UK</option>
            <option value="US">US</option>
            <option value="EU">EU</option>
          </select>
          <button
            onClick={() => run()}
            disabled={busy || (!text.trim() && !img)}
            className="ml-auto rounded-full bg-red px-6 py-2.5 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? 'Checking…' : 'Check it'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-3">Try one:</span>
        <button disabled={busy} onClick={runSampleImage} className="rounded-full bg-red-wash px-3 py-1 font-medium text-red ring-1 ring-red/40 hover:ring-red disabled:opacity-40">
          📱 Screenshot of a text
        </button>
        {SAMPLES.map((s) => (
          <button key={s.label} disabled={busy} onClick={() => run(s.text)} className="rounded-full bg-sheet px-3 py-1 text-ink-2 ring-1 ring-rule hover:ring-ink disabled:opacity-40">
            {s.label}
          </button>
        ))}
      </div>

      <div ref={resultRef} className="scroll-mt-6 pt-8">
        {busy && (
          <div className="space-y-5">
            <ol className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
              {STAGES.map((s, i) => (
                <li key={s} className={i < stage ? 'text-ink-3 line-through decoration-red' : i === stage ? 'text-ink' : 'text-ink-3/50'}>
                  {i === stage ? '● ' : i < stage ? '✓ ' : '○ '}
                  {s}
                </li>
              ))}
            </ol>
            <LinkPanel links={links} pending fromImage={Boolean(img)} />
          </div>
        )}
        {phase === 'error' && (
          <div className="rounded-2xl border-2 border-dashed border-ink-3 p-5">
            <p className="font-semibold">Red Flag could not finish this check.</p>
            <p className="mt-1 text-sm text-ink-2">{error}</p>
            <p className="mt-2 text-sm text-ink-2">If you are worried about it right now: do not click, reply or pay. Contact the company yourself using a number or app you already trust.</p>
          </div>
        )}
        {result && <VerdictView v={result.v} sig={result.sig} image={result.v.inputHadImage ? img?.preview : undefined} />}
      </div>
    </div>
  )
}
