// Telegram bot, over a webhook:
// - in a private chat, forward or paste any message, screenshot or PDF and get a verdict back
// - in a group, reply to a suspicious message with /check (or mention the bot) and the verdict goes to the group
// Telegram signs nothing, so the webhook is protected by the secret token we set when registering it.
import {after} from 'next/server'
import {timingSafeEqual} from 'node:crypto'
import {check, type Verdict} from '@/lib/verdict'
import {saveVerdict} from '@/lib/store'
import {VERDICT_TITLE, confidenceText} from '@/lib/labels'
import {pdfText} from '@/lib/pdf'

export const maxDuration = 60

const API = 'https://api.telegram.org'
const token = () => process.env.TELEGRAM_BOT_TOKEN ?? ''
const MAX_FILE = 8_000_000

type TgPhoto = {file_id: string; file_size?: number; width: number; height: number}
type TgDocument = {file_id: string; file_name?: string; mime_type?: string; file_size?: number}
type TgMessage = {
  message_id: number
  chat: {id: number; type: 'private' | 'group' | 'supergroup' | 'channel'}
  from?: {id: number; language_code?: string; is_bot?: boolean}
  text?: string
  caption?: string
  photo?: TgPhoto[]
  document?: TgDocument
  reply_to_message?: TgMessage
  forward_origin?: unknown
}

function secretOk(req: Request): boolean {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET
  const got = req.headers.get('x-telegram-bot-api-secret-token')
  if (!want || !got) return false
  const a = Buffer.from(want)
  const b = Buffer.from(got)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function tg(method: string, body: object) {
  return fetch(`${API}/bot${token()}/${method}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000)})
}

// Files are fetched from Telegram's own file server, by the path Telegram gives for our bot's file id.
async function download(fileId: string, size?: number): Promise<ArrayBuffer | null> {
  if (size && size > MAX_FILE) return null
  const res = await tg('getFile', {file_id: fileId})
  const j = (await res.json()) as {ok: boolean; result?: {file_path?: string; file_size?: number}}
  const path = j.result?.file_path
  if (!j.ok || !path || !/^[\w./-]{1,200}$/.test(path) || path.includes('..') || (j.result?.file_size ?? 0) > MAX_FILE) return null
  const file = await fetch(`${API}/file/bot${token()}/${path}`, {signal: AbortSignal.timeout(10_000)})
  return file.ok ? file.arrayBuffer() : null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function regionFor(lang = ''): 'UK' | 'US' | 'EU' {
  if (lang === 'en-US' || lang === 'en_US') return 'US'
  return ['de', 'fr', 'nl', 'es', 'it', 'lt', 'pl', 'pt', 'da', 'fi', 'sv', 'cs', 'ro', 'hu', 'el', 'bg', 'hr', 'sk', 'sl', 'lv', 'et'].includes(lang.slice(0, 2)) ? 'EU' : 'UK'
}

function verdictText(v: Verdict): string {
  const sure = confidenceText(v)
  const signs = v.red_flags.slice(0, 5).map((f, n) => `${n + 1}. "${esc(f.quote)}": ${esc(f.why)}`)
  const links = [...new Set(v.links.flatMap((l) => l.flags.filter((f) => f.severity === 'high').map((f) => `• <code>${esc(l.host)}</code>: ${esc(f.detail)}`)))].slice(0, 3)
  return [
    `<b>${VERDICT_TITLE[v.verdict]}</b>${sure ? ` · ${sure}` : ''}`,
    '',
    `<b>${esc(v.headline)}</b>`,
    esc(v.summary),
    ...(signs.length ? ['', '<b>Warning signs</b>', ...signs] : []),
    ...(links.length ? ['', '<b>Link checks</b>', ...links] : []),
    ...(v.hidden?.length ? ['', `<b>Hidden from you:</b> ${esc(v.hidden.join(' '))}`] : []),
    '',
    `<b>Check it yourself:</b> ${esc(v.check_it_yourself)}`,
    '',
    '<i>Red Flag can be wrong. If money is involved, call your bank on the number on the back of your card.</i>',
  ]
    .join('\n')
    .slice(0, 4000)
}

const HELP = [
  '<b>Red Flag</b> checks a message before you click.',
  '',
  'Forward me a suspicious message, paste the text, or send a screenshot or PDF. I check every link for real and show you the words that give a scam away.',
  '',
  "In a group: reply to a message with /check and I'll post the result for everyone.",
].join('\n')

export async function POST(req: Request) {
  if (!secretOk(req)) return new Response('unauthorised', {status: 401})
  const update = (await req.json().catch(() => null)) as {message?: TgMessage} | null
  const msg = update?.message
  if (!msg || msg.from?.is_bot) return new Response('ok')

  const text = (msg.text ?? msg.caption ?? '').trim()
  const isPrivate = msg.chat.type === 'private'
  const command = /^\/(start|help|check)(@\w+)?\b/i.exec(text)?.[1]?.toLowerCase()

  if (command === 'start' || command === 'help') {
    after(() => tg('sendMessage', {chat_id: msg.chat.id, text: HELP, parse_mode: 'HTML'}).then(() => undefined))
    return new Response('ok')
  }

  // In groups, only act when asked: /check as a reply to the message to check.
  let target: TgMessage | null = null
  if (isPrivate) target = command === 'check' && msg.reply_to_message ? msg.reply_to_message : msg
  else if (command === 'check') target = msg.reply_to_message ?? null
  if (!target) {
    if (command === 'check') after(() => tg('sendMessage', {chat_id: msg.chat.id, reply_to_message_id: msg.message_id, text: 'Reply to the message you want checked with /check.'}).then(() => undefined))
    return new Response('ok')
  }
  const t: TgMessage = target

  after(async () => {
    const send = (body: object) => tg('sendMessage', {chat_id: msg.chat.id, reply_to_message_id: t.message_id, ...body})
    try {
      await tg('sendChatAction', {chat_id: msg.chat.id, action: 'typing'})
      let body = (t.text ?? t.caption ?? '').replace(/^\/check(@\w+)?\s*/i, '').trim()
      let image: {mediaType: 'image/jpeg' | 'image/png'; data: string} | null = null
      const photo = t.photo?.at(-1)
      if (photo) {
        const buf = await download(photo.file_id, photo.file_size)
        if (buf) image = {mediaType: 'image/jpeg', data: Buffer.from(buf).toString('base64')}
      } else if (t.document) {
        const d = t.document
        const buf = await download(d.file_id, d.file_size)
        if (buf && (d.mime_type === 'application/pdf' || /\.pdf$/i.test(d.file_name ?? ''))) {
          const fromPdf = await pdfText(buf)
          if (fromPdf) body = `${body}\n\n[Attached file: ${d.file_name ?? 'document.pdf'}]\n${fromPdf}`.trim()
        } else if (buf && /^image\/(png|jpeg)$/.test(d.mime_type ?? '')) {
          image = {mediaType: d.mime_type as 'image/png' | 'image/jpeg', data: Buffer.from(buf).toString('base64')}
        }
      }
      if (!body && !image) {
        await send({text: "Send me the text, a screenshot or a PDF and I'll check it."})
        return
      }
      const v = await check({text: body, image, source: 'telegram', region: regionFor(msg.from?.language_code)})
      await saveVerdict(v)
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
      await send({
        text: verdictText(v),
        parse_mode: 'HTML',
        link_preview_options: {is_disabled: true},
        reply_markup: {inline_keyboard: [[{text: 'Full report', url: `${site}/v/${v.id}`}]]},
      })
    } catch (e) {
      const why = e instanceof Error ? e.message.replace(/\.$/, '') : 'something went wrong'
      await send({text: `Red Flag couldn't check that: ${why}. If in doubt, don't click and don't log in through any link.`}).catch(() => {})
    }
  })
  return new Response('ok')
}
