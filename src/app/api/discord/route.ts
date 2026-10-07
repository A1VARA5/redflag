// Discord, over HTTP interactions (no gateway bot):
// - right-click any message > Apps > "Red Flag this"
// - /redflag with pasted text, a link, a screenshot or a PDF, for things that arrived outside Discord
// - a "Warn the channel" button on scam results, so a mod or friend can warn everyone in one tap
// Discord wants an answer within 3 s, so checks are deferred (ephemeral) and the reply is edited when ready.
import {after} from 'next/server'
import {createPublicKey, verify as edVerify} from 'node:crypto'
import {check, type Verdict} from '@/lib/verdict'
import {loadVerdict, saveVerdict} from '@/lib/store'
import {VERDICT_COLOR, VERDICT_TITLE, confidenceText} from '@/lib/labels'
import {pdfText} from '@/lib/pdf'
import {botLimited} from '@/lib/ratelimit'

export const maxDuration = 60

const EPHEMERAL = 64
// Discord tells us the user's language; it picks the advice region.
const EU_LOCALES: Record<string, string> = {de: 'DE', fr: 'FR', nl: 'NL', 'es-ES': 'ES', it: 'IT', lt: 'LT', pl: 'PL', da: 'DK', fi: 'FI', 'sv-SE': 'SE', cs: 'CZ', ro: 'RO', hu: 'HU', el: 'GR', bg: 'BG', hr: 'HR'}
const IMAGE = /^image\/(png|jpeg|webp|gif)/
const isPdf = (a: Attachment) => /^application\/pdf/.test(a.content_type ?? '') || /\.pdf$/i.test(a.filename ?? '')

function verifyDiscord(raw: string, sig: string | null, ts: string | null): boolean {
  const pub = process.env.DISCORD_PUBLIC_KEY
  if (!pub || !sig || !ts) return false
  try {
    // Raw 32-byte Ed25519 key wrapped in the SPKI header node:crypto expects.
    const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pub, 'hex')]), format: 'der', type: 'spki'})
    return edVerify(null, Buffer.from(ts + raw), key, Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}

type Attachment = {url: string; content_type?: string; size: number; filename?: string}
type Embed = {title?: string; description?: string; url?: string; fields?: {name?: string; value?: string}[]; author?: {name?: string; url?: string}; footer?: {text?: string}}
type Component = {url?: string; label?: string; components?: Component[]}
type Msg = {content: string; attachments?: Attachment[]; embeds?: Embed[]; components?: Component[]; message_snapshots?: {message?: Msg}[]}

// Everything a message shows, including what Discord keeps outside its text: embeds (fields, author, footer),
// link buttons, and for a forwarded message the original inside message_snapshots.
function readMessage(msg: Msg): {text: string; attachments: Attachment[]} {
  const embedText = (msg.embeds ?? [])
    .map((e) => [e.author?.name, e.author?.url, e.title, e.description, e.url, ...(e.fields ?? []).flatMap((f) => [f.name, f.value]), e.footer?.text].filter(Boolean).join('\n'))
    .join('\n')
  const buttons: string[] = []
  const walk = (cs?: Component[]) => cs?.forEach((c) => (c.url ? buttons.push(`[Button "${(c.label ?? '').slice(0, 60)}" links to: ${c.url}]`) : walk(c.components)))
  walk(msg.components)
  const forwarded = (msg.message_snapshots ?? []).flatMap((s) => (s.message ? [readMessage(s.message)] : []))
  return {
    text: [msg.content, embedText, buttons.slice(0, 12).join('\n'), ...forwarded.map((f) => f.text)].filter(Boolean).join('\n\n'),
    attachments: [...(msg.attachments ?? []), ...forwarded.flatMap((f) => f.attachments)],
  }
}
type Input = {text: string; image: Attachment | null; pdf: Attachment | null; other: boolean}

// Attachment links come inside a signed interaction, but only Discord's own file servers are fetched.
const DISCORD_CDN = new Set(['cdn.discordapp.com', 'media.discordapp.net'])
function discordFile(url: string): string {
  const u = new URL(url)
  if (u.protocol !== 'https:' || !DISCORD_CDN.has(u.hostname)) throw new Error('That file is not hosted by Discord')
  return u.toString()
}

async function download(a: Attachment) {
  const r = await fetch(discordFile(a.url), {signal: AbortSignal.timeout(8000)})
  if (!r.ok) return null
  return {mediaType: a.content_type!.split(';')[0] as 'image/png', data: Buffer.from(await r.arrayBuffer()).toString('base64')}
}

function regionFor(locale: string) {
  const region = locale === 'en-US' || locale === 'es-419' ? 'US' : EU_LOCALES[locale] ? 'EU' : 'UK'
  return {region, country: EU_LOCALES[locale] ?? (region === 'US' ? 'US' : 'GB')} as const
}

function resultMessage(v: Verdict, site: string) {
  const links = [
    ...new Set(
      v.links.flatMap((l) => [
        ...(l.fromQr ? [`\`${l.host}\`: read from a QR code in the image.`] : []),
        ...(l.flags.some((f) => f.severity === 'high') ? l.flags.filter((f) => f.severity === 'high') : l.flags.filter((f) => f.severity === 'medium' && f.code !== 'qr-code'))
          .map((f) => `\`${l.host}\`: ${f.detail}`),
      ]),
    ),
  ].slice(0, 4)
  const sure = confidenceText(v)
  const danger = v.verdict === 'scam' || v.verdict === 'suspicious'
  return {
    embeds: [
      {
        title: `${VERDICT_TITLE[v.verdict]}${sure ? ` · ${sure}` : ''}`,
        description: `**${v.headline}**\n${v.summary}`,
        color: parseInt(VERDICT_COLOR[v.verdict].slice(1), 16),
        fields: [
          ...(v.red_flags.length ? [{name: 'Warning signs', value: v.red_flags.slice(0, 5).map((f, n) => `${n + 1}. "${f.quote}": ${f.why}`).join('\n').slice(0, 1024)}] : []),
          ...(links.length ? [{name: 'Link checks', value: links.join('\n').slice(0, 1024)}] : []),
          ...(v.overrides.length ? [{name: 'Checks overruled the AI', value: v.overrides.join(' ').slice(0, 1024)}] : []),
          ...(v.hidden?.length ? [{name: 'Hidden from you', value: v.hidden.join(' ').slice(0, 1024)}] : []),
          {name: 'Check it yourself', value: v.check_it_yourself.slice(0, 1024)},
        ],
        footer: {text: danger ? 'Red Flag can be wrong. Only you can see this until you warn the channel.' : 'Red Flag can be wrong. Only you can see this.'},
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {type: 2, style: 5, label: 'Full report', url: `${site}/v/${v.id}`},
          ...(danger ? [{type: 2, style: 4, label: 'Warn the channel', custom_id: `warn:${v.id}`}] : []),
        ],
      },
    ],
  }
}

// The public warning: short, no pings, links to the report rather than repeating the scam.
function warning(v: Verdict, site: string) {
  return {
    allowed_mentions: {parse: []},
    embeds: [
      {
        title: `Heads up: ${VERDICT_TITLE[v.verdict].toLowerCase()}`,
        description: `Someone checked a message here with Red Flag.\n**${v.headline}**\nDon't click links in it, reply, or pay.`,
        color: parseInt(VERDICT_COLOR[v.verdict].slice(1), 16),
        footer: {text: 'Red Flag can be wrong. Check things yourself using details you already trust.'},
      },
    ],
    components: [{type: 1, components: [{type: 2, style: 5, label: 'See why', url: `${site}/v/${v.id}`}]}],
  }
}

export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyDiscord(raw, req.headers.get('x-signature-ed25519'), req.headers.get('x-signature-timestamp'))) {
    return new Response('bad signature', {status: 401})
  }
  const i = JSON.parse(raw)
  if (i.type === 1) return Response.json({type: 1}) // PING
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin

  // "Warn the channel" button.
  if (i.type === 3 && typeof i.data?.custom_id === 'string' && i.data.custom_id.startsWith('warn:')) {
    const v = await loadVerdict(i.data.custom_id.slice(5))
    if (!v || (v.verdict !== 'scam' && v.verdict !== 'suspicious')) {
      return Response.json({type: 4, data: {content: "That result isn't available any more.", flags: EPHEMERAL}})
    }
    return Response.json({type: 4, data: warning(v, site)})
  }

  // type 3 = message command (right-click), type 1 = /redflag.
  let input: Input | null = null
  if (i.type === 2 && i.data?.type === 3) {
    const msg: Msg | undefined = i.data.resolved?.messages?.[i.data.target_id]
    if (msg) {
      const {text, attachments: atts} = readMessage(msg)
      input = {
        text,
        image: atts.find((a) => IMAGE.test(a.content_type ?? '') && a.size < 4_000_000) ?? null,
        pdf: atts.find((a) => isPdf(a) && a.size < 10_000_000) ?? null,
        other: atts.length > 0,
      }
    }
  } else if (i.type === 2 && i.data?.type === 1 && i.data.name === 'redflag') {
    const opts = (i.data.options ?? []) as {name: string; value: string}[]
    const attId = opts.find((o) => o.name === 'file' || o.name === 'screenshot')?.value
    const att: Attachment | undefined = attId ? i.data.resolved?.attachments?.[attId] : undefined
    input = {
      text: String(opts.find((o) => o.name === 'message')?.value ?? ''),
      image: att && IMAGE.test(att.content_type ?? '') && att.size < 4_000_000 ? att : null,
      pdf: att && isPdf(att) && att.size < 10_000_000 ? att : null,
      other: Boolean(att),
    }
  } else {
    return Response.json({type: 4, data: {content: 'Unknown command.', flags: EPHEMERAL}})
  }

  // The reply goes to Discord's webhook for this interaction; check both parts before building the URL.
  const appId = String(i.application_id ?? '')
  const token = String(i.token ?? '')
  if ((process.env.DISCORD_APPLICATION_ID && appId !== process.env.DISCORD_APPLICATION_ID) || !/^\d{5,25}$/.test(appId) || !/^[\w.:=-]{20,1000}$/.test(token)) {
    return new Response('bad interaction', {status: 400})
  }
  const userId = i.member?.user?.id ?? i.user?.id
  if (botLimited('discord', userId)) {
    return Response.json({type: 4, data: {content: "That's a lot of checks in a few minutes. Please wait a bit and try again.", flags: EPHEMERAL}})
  }
  after(async () => {
    const edit = (body: object) =>
      fetch(`https://discord.com/api/v10/webhooks/${encodeURIComponent(appId)}/${encodeURIComponent(token)}/messages/@original`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)})
    try {
      if (!input) throw new Error('Could not read that message')
      const image = input.image ? await download(input.image) : null
      let text = input.text
      if (input.pdf) {
        const r = await fetch(discordFile(input.pdf.url), {signal: AbortSignal.timeout(10_000)})
        const fromPdf = r.ok ? await pdfText(await r.arrayBuffer()) : null
        if (fromPdf) text = `${text}\n\n[Attached file: ${input.pdf.filename ?? 'document.pdf'}]\n${fromPdf}`.trim()
        else if (!text && !image) throw new Error('That PDF has no text Red Flag can read (it may be a scan). Send a screenshot of it instead')
      }
      if (!text && !image) {
        throw new Error(input.other ? 'Red Flag can read text, screenshots and PDFs, but not that kind of file' : 'There is no text or image to check')
      }
      const v = await check({text, image, source: 'discord', ...regionFor(String(i.locale ?? ''))})
      await saveVerdict(v)
      await edit(resultMessage(v, site))
    } catch (e) {
      const why = e instanceof Error ? e.message.replace(/\.$/, '') : 'something went wrong'
      await edit({content: `Red Flag couldn't check that: ${why}. If in doubt, don't click and don't log in through any link.`})
    }
  })
  return Response.json({type: 5, data: {flags: EPHEMERAL}})
}
