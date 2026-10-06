// Email channel: someone forwards a suspicious email to the Red Flag inbox (Agentboxd),
// the webhook lands here, and the verdict goes back as a reply in the same thread.
import {createHmac, timingSafeEqual} from 'node:crypto'
import {parse} from 'tldts'
import type {Verdict} from './verdict'
import {BANK_ADVICE, VERDICT_BG, VERDICT_COLOR, VERDICT_TITLE, confidenceText} from './labels'

const API = 'https://api.agentboxd.com/v1'

export function verifyMailroom(raw: string, ts: string | null, sig: string | null): boolean {
  const secret = process.env.AGENTBOXD_WEBHOOK_SECRET
  if (!secret || !ts || !sig) return false
  const sent = Number(ts)
  if (!Number.isFinite(sent) || Math.abs(Date.now() / 1000 - sent) > 300) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex'))
  const got = Buffer.from(sig)
  return expected.length === got.length && timingSafeEqual(expected, got)
}

// Anyone can put any address in "From". Before replying, check that the sending server proved it may send for
// that address: DMARC pass, or a DKIM or SPF pass for the same domain as the From address. A pass for some other
// domain proves nothing. Otherwise a forged sender would let a stranger make Red Flag email someone else.
export function senderVerified(m: {headers?: Record<string, string>; labels?: string[]; from?: MailMessage['from']}): boolean {
  if (m.labels?.some((l) => /spoof/i.test(l))) return false
  const auth = Object.entries(m.headers ?? {}).find(([k]) => k.toLowerCase() === 'authentication-results')?.[1] ?? ''
  if (/\bdmarc=fail\b/i.test(auth)) return false
  if (/\bdmarc=pass\b/i.test(auth)) return true
  const fromDomain = parse(senderOf(m).split('@')[1] ?? '').domain
  if (!fromDomain) return false
  const aligned = (d: string | undefined) => Boolean(d) && parse(d!.toLowerCase()).domain === fromDomain
  const dkim = /\bdkim=pass\b[^;]*?\bheader\.(?:d=|i=[^@\s;]*@)([^\s;]+)/i.exec(auth)?.[1]
  const spf = /\bspf=pass\b[^;]*?\bsmtp\.mailfrom=(?:[^@\s;]*@)?([^\s;]+)/i.exec(auth)?.[1]
  return aligned(dkim) || aligned(spf)
}

export type MailMessage = {
  id: string
  screening?: {state?: string; reason?: string}
  withheld?: {state?: string; reason?: string}
  thread_id?: string
  from?: string | {address?: string; email?: string; name?: string}
  subject?: string
  text?: string | null
  html?: string | null
  extracted_text?: string | null
  ai?: {
    category?: unknown
    risk?: {injection?: number; phishing?: number}
    needs_human?: unknown
    verification?: unknown
    local_screen?: {flagged?: boolean; reasons?: string[]; hidden_chars?: number}
  }
  labels?: string[]
  headers?: Record<string, string>
  attachments?: {id: string; filename?: string; content_type?: string; size?: number}[]
}

function auth() {
  return {Authorization: `Bearer ${process.env.AGENTBOXD_API_KEY}`, 'content-type': 'application/json'}
}

// Agentboxd can quarantine ("hold") mail it thinks is phishing and hide its content from agents.
// For a scam checker that is backwards, so the workspace runs with screening off: we still get Agentboxd's
// phishing and injection scores as evidence, plus the content to explain.
export async function getMessage(messageId: string): Promise<MailMessage | null> {
  const res = await fetch(`${API}/messages/${messageId}`, {headers: auth(), signal: AbortSignal.timeout(10_000)})
  if (!res.ok) return null
  const j = await res.json()
  return (j.id ? j : j.data) as MailMessage
}

export async function downloadAttachment(id: string): Promise<{data: string; type: string} | null> {
  const res = await fetch(`${API}/attachments/${id}`, {headers: auth(), signal: AbortSignal.timeout(10_000)})
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > 4 * 1024 * 1024) return null
  return {data: buf.toString('base64'), type: res.headers.get('content-type') ?? ''}
}

// Text of a document attachment (PDF, Word, Excel, scans), read by Agentboxd. Fake invoices and "payment
// instructions" often arrive as a PDF with a short covering email, so the attachment is where the scam is.
// OCR can take a few seconds, so this waits briefly while extraction is still running.
export async function attachmentText(messageId: string, attachmentId: string, maxChars = 20_000): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API}/messages/${messageId}/attachments/${attachmentId}/text?max_chars=${maxChars}`, {headers: auth(), signal: AbortSignal.timeout(5000)})
      if (!res.ok) return null
      const j = (await res.json()) as {text?: string | null; extraction?: {status?: string}}
      if (j.text) return j.text.slice(0, maxChars)
      if (j.extraction?.status && j.extraction.status !== 'pending' && j.extraction.status !== 'processing') return null
    } catch {
      return null
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return null
}

export async function reply(inboxId: string, messageId: string, text: string, html: string) {
  const res = await fetch(`${API}/inboxes/${inboxId}/messages/${messageId}/reply`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({text, html}),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`reply failed ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

export function senderOf(m: Pick<MailMessage, 'from'>): string {
  const f = m.from
  if (!f) return ''
  if (typeof f === 'string') return (f.match(/<([^>]+)>/)?.[1] ?? f).toLowerCase()
  return (f.address ?? f.email ?? '').toLowerCase()
}

// Text an email's HTML hides from the reader: display:none, visibility:hidden, zero size or opacity, the hidden
// attribute, and comments. Newsletters hide harmless preview text this way, so only hidden text that gives an AI
// orders counts. A human never sees it; a careless AI reads it as an instruction.
export const HTML_LIMIT = 200_000
const HIDING = /display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0+(px|pt|em|%)?\s*(;|$)|opacity\s*:\s*0+(\.0+)?\s*(;|$)|max-height\s*:\s*0+(px)?\s*(;|$)/i
const ORDERS_AN_AI =
  /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(instructions?|previous|above|prior|rules|prompt)\b|\b(classify|mark|label|treat|flag|report)\b[^.]{0,30}\b(as )?(safe|legitimate|legit|verified|trusted|not (spam|a scam|phishing))\b|\b(note|message|instructions?)s? (to|for) (the |any )?(ai|assistant|model|llm|filters?|checkers?|scanners?|classifiers?)\b|\bsystem prompt\b/i
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'source', 'col', 'area', 'base', 'wbr'])

function hides(attrs: string): boolean {
  const style = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs)
  if (style && HIDING.test(style[2] ?? style[3] ?? '')) return true
  // The bare `hidden` attribute, not aria-hidden or a class name containing "hidden".
  const names = attrs.replace(/=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, '=')
  return /(^|\s)hidden(\s|=|\/|$)/i.test(names) && !/(^|\s)hidden\s*=\s*["']?false/i.test(attrs)
}

// Index of the tag that closes the element opened just before `from`, counting nested tags of the same name.
function closeOf(html: string, name: string, from: number): number {
  const re = new RegExp(`<(/?)${name}\\b[^<>]*>`, 'gi')
  re.lastIndex = from
  let depth = 1
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1
    if (depth === 0) return m.index
  }
  return Math.min(html.length, from + 2000)
}

export function hiddenHtmlText(raw: string): string[] {
  const html = raw.slice(0, HTML_LIMIT)
  const found: string[] = []
  // [^<>] rather than [^>]: a stray "<" with no ">" must not make every later match scan to the end.
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^<>]*)>/gi)) {
    if (found.length >= 30) break
    const name = m[1].toLowerCase()
    if (VOID.has(name) || !hides(m[2])) continue
    const start = m.index! + m[0].length
    found.push(htmlToText(html.slice(start, closeOf(html, name, start))))
  }
  for (let i = html.indexOf('<!--'); i >= 0 && found.length < 40; ) {
    const j = html.indexOf('-->', i + 4)
    if (j < 0) break
    found.push(html.slice(i + 4, j))
    i = html.indexOf('<!--', j + 3)
  }
  return [...new Set(found.map((t) => t.replace(/\s+/g, ' ').trim()))]
    .filter((t) => t.length >= 8 && ORDERS_AN_AI.test(t))
    .slice(0, 5)
    .map((t) => t.slice(0, 300))
}

export function htmlToText(html: string) {
  return html
    .slice(0, HTML_LIMIT)
    .replace(/<(script|style)\b[^<>]*>[^<]*(?:<(?!\/\1>)[^<]*)*<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/tr>/gi, '\n')
    // The link target goes in front of the link text, so a fake "paypal.com" label can't hide where it points.
    .replace(/<a\b[^<>]*?\bhref="([^"<>]+)"[^<>]*>/gi, ' ($1) ')
    .replace(/<[^<>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}


const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderReply(v: Verdict, url: string): {text: string; html: string} {
  const linkFlags = [...new Set(v.links.flatMap((l) => l.flags.filter((f) => f.severity === 'high' || f.severity === 'medium').map((f) => `${l.host}: ${f.detail}`)))]
  const sure = confidenceText(v)
  const text = [
    `Red Flag: ${VERDICT_TITLE[v.verdict]}${sure ? ` (${sure})` : ''}`,
    '',
    v.headline,
    '',
    v.summary,
    '',
    v.red_flags.length ? 'Warning signs:' : '',
    ...v.red_flags.map((f, i) => `${i + 1}. "${f.quote}": ${f.why}`),
    linkFlags.length ? '\nLink checks:' : '',
    ...linkFlags.map((f) => `- ${f}`),
    v.overrides.length ? `\n${v.overrides.join(' ')}` : '',
    v.hidden?.length ? `\nHidden characters found: ${v.hidden.join(' ')}` : '',
    '',
    `Check it yourself, safely: ${v.check_it_yourself}`,
    v.steps.length ? '\nWhat to do now:' : '',
    ...v.steps.map((s, i) => `${i + 1}. ${s.text}${s.url ? ` (${s.url})` : ''}`),
    '',
    `Advice above is for the ${v.region}. Steps for the UK, US and EU are in the full report: ${url}`,
    '',
    `Red Flag is an automated checker and can be wrong. ${BANK_ADVICE}`,
  ]
    .filter((l) => l !== '')
    .join('\n')

  const c = VERDICT_COLOR[v.verdict]
  const card = 'margin-top:16px;background:#ffffff;border:1px solid #e2e6ec;border-radius:12px;padding:18px'
  const label = 'font-size:13px;font-weight:600;color:#0d1b2a'
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:'IBM Plex Sans','Segoe UI',Helvetica,Arial,sans-serif;color:#0d1b2a">
<div style="max-width:620px;margin:0 auto;padding:24px 16px">
<div style="font-weight:600;font-size:15px;color:#0f2a47">Red Flag</div>
<div style="margin-top:12px;border:1px solid ${c};border-radius:12px;background:${VERDICT_BG[v.verdict]};padding:18px">
<div style="font-size:24px;font-weight:700;color:${c}">${VERDICT_TITLE[v.verdict]}</div>
${sure ? `<div style="font-size:13px;color:#44505f;margin-top:4px">${sure}</div>` : ''}
<div style="font-size:16px;font-weight:600;margin-top:10px">${esc(v.headline)}</div>
<div style="font-size:14px;color:#44505f;margin-top:6px;line-height:1.5">${esc(v.summary)}</div>
${v.overrides.length ? `<div style="margin-top:10px;font-size:13px;color:#44505f">${esc(v.overrides.join(' '))}</div>` : ''}
${v.hidden?.length ? `<div style="margin-top:10px;font-size:13px;color:#44505f">Hidden characters found: ${esc(v.hidden.join(' '))}</div>` : ''}
</div>
${
  v.red_flags.length
    ? `<div style="${card}">
<div style="${label}">Warning signs</div>
${v.red_flags
  .map(
    (f, i) => `<div style="margin-top:12px"><span style="color:#c8231a;font-weight:700">${i + 1}</span> <span style="border-bottom:2px solid #c8231a">${esc(f.quote)}</span><div style="font-size:14px;color:#44505f;margin-top:3px">${esc(f.why)}</div></div>`,
  )
  .join('')}
</div>`
    : ''
}
${
  linkFlags.length
    ? `<div style="${card}">
<div style="${label}">Link checks</div>
${linkFlags.map((f) => `<div style="font-size:14px;margin-top:8px;color:#44505f">${esc(f)}</div>`).join('')}
</div>`
    : ''
}
<div style="${card}">
<div style="${label}">Check it yourself, safely</div>
<div style="margin-top:6px;font-size:14px">${esc(v.check_it_yourself)}</div>
</div>
${
  v.steps.length
    ? `<div style="margin-top:16px;background:#0f2a47;color:#ffffff;border-radius:12px;padding:18px">
<div style="font-size:18px;font-weight:600">What to do now</div>
${v.steps.map((s, i) => `<div style="margin-top:8px;font-size:14px">${i + 1}. ${s.url ? `<a href="${esc(s.url)}" style="color:#ffffff">${esc(s.text)}</a>` : esc(s.text)}</div>`).join('')}
</div>`
    : ''
}
<div style="margin-top:20px;text-align:center"><a href="${esc(url)}" style="display:inline-block;background:#0f2a47;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;padding:12px 22px">See the full report</a></div>
<div style="margin-top:18px;font-size:12px;color:#7a8594;text-align:center;line-height:1.5">Red Flag is an automated checker and can be wrong. ${BANK_ADVICE}</div>
</div></body></html>`
  return {text, html}
}
