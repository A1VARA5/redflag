// Email channel: someone forwards a suspicious email to the Red Flag inbox (Agentboxd),
// the webhook lands here, and the verdict goes back as a reply in the same thread.
import {createHmac, timingSafeEqual} from 'node:crypto'
import type {Verdict} from './verdict'

const API = 'https://api.agentboxd.com/v1'

export function verifyMailroom(raw: string, ts: string | null, sig: string | null): boolean {
  const secret = process.env.AGENTBOXD_WEBHOOK_SECRET
  if (!secret || !ts || !sig) return false
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex'))
  const got = Buffer.from(sig)
  return expected.length === got.length && timingSafeEqual(expected, got)
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
  ai?: {category?: string; risk?: {injection?: number; phishing?: number}; needs_human?: boolean}
  headers?: Record<string, string>
  attachments?: {id: string; filename?: string; content_type?: string; size?: number}[]
}

function auth() {
  return {Authorization: `Bearer ${process.env.AGENTBOXD_API_KEY}`, 'content-type': 'application/json'}
}

// Agentboxd quarantines ("holds") mail it thinks is phishing, and hides the content from agents.
// A scam checker is the one agent that should read it, so we ask for held content explicitly
// (needs an API key with the messages:release permission).
export async function getMessage(messageId: string): Promise<MailMessage | null> {
  const res = await fetch(`${API}/messages/${messageId}?include_held=true&include_unscreened=true`, {headers: auth(), signal: AbortSignal.timeout(10_000)})
  if (!res.ok) return null
  const j = await res.json()
  return (j.data ?? j) as MailMessage
}

export async function downloadAttachment(id: string): Promise<{data: string; type: string} | null> {
  const res = await fetch(`${API}/attachments/${id}`, {headers: auth(), signal: AbortSignal.timeout(10_000)})
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > 4 * 1024 * 1024) return null
  return {data: buf.toString('base64'), type: res.headers.get('content-type') ?? ''}
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

export function senderOf(m: MailMessage): string {
  const f = m.from
  if (!f) return ''
  if (typeof f === 'string') return (f.match(/<([^>]+)>/)?.[1] ?? f).toLowerCase()
  return (f.address ?? f.email ?? '').toLowerCase()
}

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/tr>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
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

const WORD = {scam: 'SCAM', suspicious: 'SUSPICIOUS', unclear: "CAN'T TELL", safe: 'NO RED FLAGS FOUND'} as const
const COLOR = {scam: '#d7261e', suspicious: '#b86e00', unclear: '#4a5568', safe: '#2f6b4f'} as const

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderReply(v: Verdict, url: string): {text: string; html: string} {
  const linkFlags = v.links.flatMap((l) => l.flags.filter((f) => f.severity === 'high' || f.severity === 'medium').map((f) => `${l.host}: ${f.detail}`))
  const text = [
    `Red Flag verdict: ${WORD[v.verdict]}${v.verdict === 'safe' ? '' : ` (${v.confidence}% sure)`}`,
    '',
    v.headline,
    '',
    v.summary,
    '',
    v.red_flags.length ? 'Warning signs:' : '',
    ...v.red_flags.map((f, i) => `${i + 1}. "${f.quote}": ${f.why}`),
    linkFlags.length ? '\nLink check (no AI):' : '',
    ...linkFlags.map((f) => `- ${f}`),
    v.overrides.length ? `\n${v.overrides.join(' ')}` : '',
    '',
    `Check it yourself, safely: ${v.check_it_yourself}`,
    v.steps.length ? '\nWhat to do now:' : '',
    ...v.steps.map((s, i) => `${i + 1}. ${s.text}${s.url ? ` (${s.url})` : ''}`),
    '',
    `Full marked-up report: ${url}`,
    '',
    'Red Flag is an automated checker and can be wrong. If money is involved, call your bank on the number on your card.',
  ]
    .filter((l) => l !== '')
    .join('\n')

  const c = COLOR[v.verdict]
  const html = `<!doctype html><html><body style="margin:0;background:#f5f1e8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#16130f">
<div style="max-width:620px;margin:0 auto;padding:24px 16px">
<div style="font-weight:600;font-size:14px;color:#d7261e">&#9873; Red Flag</div>
<div style="margin-top:12px;border:2px solid ${c};border-radius:14px;background:#fffdf8;padding:18px">
<div style="font-family:Georgia,serif;font-size:34px;line-height:1;color:${c}">${WORD[v.verdict]}</div>
${v.verdict === 'safe' ? '' : `<div style="font-size:12px;color:#5b554c;margin-top:4px">${v.confidence}% sure</div>`}
<div style="font-size:18px;font-weight:600;margin-top:10px">${esc(v.headline)}</div>
<div style="font-size:14px;color:#5b554c;margin-top:6px;line-height:1.5">${esc(v.summary)}</div>
${v.overrides.length ? `<div style="margin-top:10px;font-size:13px;border:1px dashed #8f887c;border-radius:8px;padding:8px">${esc(v.overrides.join(' '))}</div>` : ''}
</div>
${
  v.red_flags.length
    ? `<div style="margin-top:16px;background:#fffdf8;border:1px solid #e4ddcf;border-radius:14px;padding:18px">
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8f887c;font-weight:600">Warning signs</div>
${v.red_flags
  .map(
    (f, i) => `<div style="margin-top:12px"><span style="color:#d7261e;font-weight:700">${i + 1}</span> <span style="border-bottom:2px solid #d7261e;background:#fde3dc">${esc(f.quote)}</span><div style="font-size:14px;color:#5b554c;margin-top:3px">${esc(f.why)}</div></div>`,
  )
  .join('')}
</div>`
    : ''
}
${
  linkFlags.length
    ? `<div style="margin-top:16px;background:#fffdf8;border:1px solid #e4ddcf;border-radius:14px;padding:18px">
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8f887c;font-weight:600">Link check (no AI)</div>
${linkFlags.map((f) => `<div style="font-size:14px;margin-top:8px;font-family:Consolas,monospace">${esc(f)}</div>`).join('')}
</div>`
    : ''
}
<div style="margin-top:16px;background:#fffdf8;border:1px solid #e4ddcf;border-radius:14px;padding:18px">
<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8f887c;font-weight:600">Check it yourself, safely</div>
<div style="margin-top:6px;font-weight:600">${esc(v.check_it_yourself)}</div>
</div>
${
  v.steps.length
    ? `<div style="margin-top:16px;background:#16130f;color:#f5f1e8;border-radius:14px;padding:18px">
<div style="font-family:Georgia,serif;font-size:24px">What to do now</div>
${v.steps.map((s, i) => `<div style="margin-top:8px;font-size:15px"><span style="color:#8f887c">${String(i + 1).padStart(2, '0')}</span>&nbsp; ${s.url ? `<a href="${esc(s.url)}" style="color:#f5f1e8">${esc(s.text)}</a>` : esc(s.text)}</div>`).join('')}
</div>`
    : ''
}
<div style="margin-top:20px;text-align:center"><a href="${esc(url)}" style="display:inline-block;background:#d7261e;color:#fff;text-decoration:none;font-weight:600;border-radius:999px;padding:12px 22px">See the full marked-up report</a></div>
<div style="margin-top:18px;font-size:12px;color:#8f887c;text-align:center;line-height:1.5">Red Flag is an automated checker and can be wrong. If money is involved, call your bank on the number on your card.</div>
</div></body></html>`
  return {text, html}
}
