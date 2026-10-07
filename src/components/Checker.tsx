'use client'

import {useEffect, useRef, useState} from 'react'
import type {Verdict} from '@/lib/verdict'
import type {LinkReport} from '@/lib/links'
import {SAMPLES} from '@/lib/samples'
import {VerdictView} from './VerdictView'
import {LiveLinks} from './LiveLinks'
import {Arrow, Check, Image as ImageIcon, Lock, Spinner} from './Icons'

type Img = {
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
  data: string
  preview: string
}
type Phase = 'idle' | 'checking' | 'done' | 'error'
type Doc = {name: string; data: string}

const MAX_PDF = 3 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1])
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
}

async function fileToImg(file: File): Promise<Img | null> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return null
  if (file.size > 3 * 1024 * 1024) {
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
    r.onerror = () => res('')
    r.readAsDataURL(file)
  })
  if (!url) return null
  return {
    mediaType: file.type as Img['mediaType'],
    data: url.split(',')[1],
    preview: url,
  }
}

function Step({state, children}: {state: 'done' | 'active' | 'todo'; children: React.ReactNode}) {
  return (
    <li className={`flex items-start gap-3 ${state === 'todo' ? 'text-ink-3' : 'text-ink'}`}>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {state === 'done' ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-safe text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : state === 'active' ? (
          <Spinner className="h-5 w-5 text-navy" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-line-2" />
        )}
      </span>
      <span>{children}</span>
    </li>
  )
}

export function Checker({blocklistSize, patternCount}: {blocklistSize: string; patternCount: number}) {
  const [text, setText] = useState('')
  const [img, setImg] = useState<Img | null>(null)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [fileNote, setFileNote] = useState<string | null>(null)
  const [region, setRegion] = useState<'UK' | 'US' | 'EU'>('UK')
  const regionTouched = useRef(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [links, setLinks] = useState<LinkReport[] | null>(null)
  const [result, setResult] = useState<{
    v: Verdict
    sig: string
    image?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [wasImage, setWasImage] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem('rf-region')
    } catch {}
    const saved = stored === 'UK' || stored === 'US' || stored === 'EU' ? stored : null
    // Default advice region from the visitor's country (the server sees it; nothing is stored).
    fetch('/api/geo')
      .then((r) => r.json())
      .then((g: {region: 'UK' | 'US' | 'EU'}) => {
        if (!regionTouched.current) setRegion(saved ?? g.region)
      })
      .catch(() => {
        if (saved) setRegion(saved)
      })
  }, [])

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (runningRef.current) return
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        await addFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  useEffect(() => {
    if (phase !== 'checking') return
    const start = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250)
    return () => clearInterval(t)
  }, [phase])

  // Screenshots go to the AI as images; PDFs are turned into text on the server.
  async function addFile(f: File) {
    if (runningRef.current) return
    setFileNote(null)
    try {
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        if (f.size > MAX_PDF) return setFileNote('That PDF is over 3 MB. Try a screenshot of the important page instead.')
        setDoc({name: f.name, data: await fileToBase64(f)})
        return
      }
      const i = await fileToImg(f)
      if (!i) return setFileNote('Red Flag can read screenshots (PNG, JPEG, WebP, GIF) and PDFs.')
      setImg(i)
    } catch {
      setFileNote('That file could not be read. Try another screenshot or PDF.')
    }
  }

  async function runSamplePdf() {
    if (runningRef.current) return
    try {
      const response = await fetch('/sample-invoice.pdf')
      if (!response.ok) throw new Error('Example unavailable')
      const blob = await response.blob()
      const sample = {name: 'Invoice-BL-20461.pdf', data: await fileToBase64(new File([blob], 'Invoice-BL-20461.pdf', {type: 'application/pdf'}))}
      setText('')
      setImg(null)
      setDoc(sample)
      run('', undefined, sample)
    } catch {
      setFileNote('The example could not load. Please try again or paste a message.')
    }
  }

  async function runSampleImage() {
    if (runningRef.current) return
    try {
      const response = await fetch('/sample-sms')
      if (!response.ok) throw new Error('Example unavailable')
      const blob = await response.blob()
      const sample = await fileToImg(new File([blob], 'sample.png', {type: 'image/png'}))
      if (!sample) return
      setText('')
      setImg(sample)
      setDoc(null)
      run(undefined, sample)
    } catch {
      setFileNote('The example could not load. Please try again or paste a message.')
    }
  }

  async function run(override?: string, imgOverride?: Img, docOverride?: Doc) {
    if (runningRef.current) return
    const useImg = imgOverride ?? (override !== undefined ? null : img)
    const useDoc = docOverride ?? (override !== undefined || imgOverride ? null : doc)
    const body = {
      text: override ?? (imgOverride ? '' : text),
      image: useImg ? {mediaType: useImg.mediaType, data: useImg.data} : null,
      document: useDoc,
      region,
    }
    if (!body.text.trim() && !body.image && !body.document) return
    // Vercel accepts request bodies up to 4.5 MB.
    if ((body.image?.data.length ?? 0) + (body.document?.data.length ?? 0) > 4_300_000) {
      setFileNote('The screenshot and PDF together are too big. Remove one and try again.')
      return
    }
    if (override !== undefined && !imgOverride && !docOverride) {
      setText(override)
      setImg(null)
      setDoc(null)
    }
    try {
      localStorage.setItem('rf-region', region)
    } catch {}
    runningRef.current = true
    setFileNote(null)
    setWasImage(Boolean(useImg))
    setElapsed(0)
    setPhase('checking')
    setLinks(null)
    setResult(null)
    setError(null)
    setTimeout(
      () =>
        resultRef.current?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        }),
      50,
    )
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body),
      })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? (res.status === 413 ? 'That screenshot is too big. Try a smaller one.' : `The check failed (error ${res.status}). Please try again.`))
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let gotVerdict = false
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
          if (ev.type === 'links') setLinks(ev.links)
          else if (ev.type === 'verdict') {
            gotVerdict = true
            setResult({v: ev.verdict, sig: ev.sig, image: useImg?.preview})
            setPhase('done')
          } else if (ev.type === 'error') throw new Error(ev.error)
        }
      }
      if (!gotVerdict) throw new Error('The check took too long and stopped. Please try again.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setPhase('error')
    } finally {
      runningRef.current = false
    }
  }

  const busy = phase === 'checking'
  const linkCount = links?.length ?? 0

  return (
    <div className="checker">
      <section className="checker-composer" id="check" aria-labelledby="check-title">
        <div className="checker-topline"><h2 id="check-title">Check a message</h2><span>No account needed</span></div>
        <p className="checker-instruction">Paste text, or add a screenshot or PDF.</p>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!busy) setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={async (e) => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files[0]
            if (f) await addFile(f)
          }}
          className={`checker-input overflow-hidden border transition-colors ${drag ? 'border-navy ring-2 ring-navy/20' : 'border-line-2'}`}
        >
          <label htmlFor="msg" className="sr-only">
            The message you are unsure about
          </label>
          <textarea
            id="msg"
            disabled={busy}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run() }
            }}
            rows={5}
            placeholder="Paste a message or email here…"
            className="block w-full resize-y bg-transparent px-5 pt-4 pb-3 text-[17px] leading-7 text-ink outline-none placeholder:text-ink-3"
          />
          {img && (
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-line bg-bg p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="Your screenshot" className="h-14 w-14 rounded-md object-cover" />
              <span className="text-sm text-ink-2">Screenshot added</span>
              <button disabled={busy} onClick={() => setImg(null)} className="ml-auto rounded-md px-2 py-1 text-sm text-ink-3 hover:bg-muted-bg hover:text-ink">
                Remove
              </button>
            </div>
          )}
          {doc && (
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-line bg-bg p-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-md border border-line-2 bg-card text-[13px] font-semibold text-ink-2">PDF</span>
              <span className="min-w-0 truncate text-sm text-ink-2">{doc.name}</span>
              <button disabled={busy} onClick={() => setDoc(null)} className="ml-auto rounded-md px-2 py-1 text-sm text-ink-3 hover:bg-muted-bg hover:text-ink">
                Remove
              </button>
            </div>
          )}
          {fileNote && <p role="alert" className="mx-5 mb-3 text-sm text-warn">{fileNote}</p>}
          <div className="checker-toolbar flex flex-wrap items-center gap-2 border-t border-line bg-bg/60 px-3 py-3 sm:px-4">
            <button
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-line-2 bg-card px-3 py-2 text-sm font-medium text-ink-2 hover:border-ink hover:text-ink"
            >
              <ImageIcon className="h-4 w-4" /> Add screenshot or PDF
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) await addFile(f)
                e.target.value = ''
              }}
            />
            <label className="advice-region"><span>Advice for</span><select
              disabled={busy}
              value={region}
              onChange={(e) => {
                regionTouched.current = true
                setRegion(e.target.value as typeof region)
              }}
              className="rounded-lg border border-line-2 bg-card px-3 py-2 text-sm font-medium text-ink-2"
            >
              <option value="UK">United Kingdom</option>
              <option value="US">United States</option>
              <option value="EU">European Union</option>
            </select></label>
            <button
              onClick={() => run()}
              disabled={busy || (!text.trim() && !img && !doc)}
              className="checker-submit ml-auto flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <>
                  <Spinner className="h-4 w-4" /> Checking
                </>
              ) : (
                <>Check for scams <Arrow className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>

        {phase !== 'checking' && <LiveLinks text={text} />}

        <div className="example-list">
          <span className="example-label">Try a sample:</span>
          {SAMPLES.slice(0, 3).map((s) => <button type="button" key={s.label} disabled={busy} onClick={() => run(s.text)} className="example-chip">{s.label} <span aria-hidden>↗</span></button>)}
        </div>
        <details className="more-examples">
          <summary>More sample checks</summary>
          <div>
            <button disabled={busy} onClick={runSampleImage} className="example-chip">Screenshot of a text</button>
            <button disabled={busy} onClick={runSamplePdf} className="example-chip">Fake invoice PDF</button>
            {SAMPLES.slice(3).map((s) => <button key={s.label} disabled={busy} onClick={() => run(s.text)} className="example-chip">{s.label}</button>)}
          </div>
        </details>
        <p className="checker-privacy flex gap-1.5 text-ink-3">
          <Lock className="h-4 w-4" /> Nothing you paste here is stored unless you choose to share the result.
        </p>
      </section>

      <div ref={resultRef} className="checker-result" aria-busy={busy}>
        {busy && (
          <div className="checking-state fade-in rounded-xl border border-line p-5 sm:p-6" role="status" aria-live="polite">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Checking your message</div>
              <div aria-hidden className="text-sm tabular-nums text-ink-3">{elapsed}s</div>
            </div>
            <div className="checking-track" aria-hidden />
            <ol className="mt-4 space-y-3 text-[15px]">
              <Step state="done">{wasImage ? 'Screenshot received' : doc ? 'PDF received' : 'Message received'}</Step>
              <Step state={links ? 'done' : 'active'}>
                {links
                  ? linkCount === 0
                    ? wasImage
                      ? 'Links inside the screenshot will be checked once it has been read'
                      : 'No links to check'
                    : `Checked ${linkCount} link${linkCount > 1 ? 's' : ''} against Google Safe Browsing and ${blocklistSize} known phishing sites`
                  : 'Looking for links and checking them against Google Safe Browsing and known phishing sites'}
              </Step>
              <Step state={links ? 'active' : 'todo'}>
                {wasImage ? 'Reading the screenshot and comparing it with ' : 'Reading the message and comparing it with '}
                {patternCount} known scam types
              </Step>
              <Step state="todo">Marking the warning signs</Step>
            </ol>
          </div>
        )}
        {phase === 'error' && (
          <div role="alert" className="rounded-xl border border-warn-line bg-warn-bg p-5">
            <p className="font-semibold text-ink">We couldn&apos;t finish this check.</p>
            <p className="mt-1 text-sm text-ink-2">{error}</p>
            <button type="button" onClick={() => run()} className="mt-3 rounded-md border border-warn-line px-4 py-2 text-sm font-semibold">Try again</button>
            <p className="mt-2 text-sm text-ink-2">
              If you&apos;re worried right now: don&apos;t click, reply or pay. Contact the company yourself using a number or app you already trust.
            </p>
          </div>
        )}
        {result && <VerdictView v={result.v} sig={result.sig} image={result.v.inputHadImage ? result.image : undefined} />}
      </div>
    </div>
  )
}
