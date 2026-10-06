// Discord, over HTTP interactions (no gateway bot):
// - right-click any message > Apps > "Red Flag this"
// - /redflag with pasted text, a link or a screenshot, for things that arrived outside Discord
// - a "Warn the channel" button on scam results, so a mod or friend can warn everyone in one tap
// Discord wants an answer within 3 s, so checks are deferred (ephemeral) and the reply is edited when ready.
import {after} from 'next/server'
import {createPublicKey, verify as edVerify} from 'node:crypto'
import {check, type Verdict} from '@/lib/verdict'
import {loadVerdict, saveVerdict} from '@/lib/store'
import {VERDICT_COLOR, VERDICT_TITLE, confidenceText} from '@/lib/labels'

export const maxDuration = 60

const EPHEMERAL = 64
// Discord tells us the user's language; it picks the advice region.
const EU_LOCALES: Record<string, string> = {de: 'DE', fr: 'FR', nl: 'NL', 'es-ES': 'ES', it: 'IT', lt: 'LT', pl: 'PL', da: 'DK', fi: 'FI', 'sv-SE': 'SE', cs: 'CZ', ro: 'RO', hu: 'HU', el: 'GR', bg: 'BG', hr: 'HR'}
const IMAGE = /^image\/(png|jpeg|webp|gif)/

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

type Attachment = {url: string; content_type?: string; size: number}
type Msg = {content: string; attachments?: Attachment[]; embeds?: {title?: string; description?: string; url?: string}[]}
type Input = {text: string; image: Attachment | null}

async function download(a: Attachment) {
  const r = await fetch(a.url, {signal: AbortSignal.timeout(8000)})
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
        ...l.flags.filter((f) => f.severity === 'high').map((f) => `\`${l.host}\`: ${f.detail}`),
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
          ...(v.hidden?.length ? [{name: 'Hidden characters found', value: v.hidden.join(' ').slice(0, 1024)}] : []),
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
      const embedText = (msg.embeds ?? []).map((e) => [e.title, e.description, e.url].filter(Boolean).join('\n')).join('\n')
      input = {
        text: [msg.content, embedText].filter(Boolean).join('\n\n'),
        image: msg.attachments?.find((a) => IMAGE.test(a.content_type ?? '') && a.size < 4_000_000) ?? null,
      }
    }
  } else if (i.type === 2 && i.data?.type === 1 && i.data.name === 'redflag') {
    const opts = (i.data.options ?? []) as {name: string; value: string}[]
    const attId = opts.find((o) => o.name === 'screenshot')?.value
    const att: Attachment | undefined = attId ? i.data.resolved?.attachments?.[attId] : undefined
    input = {
      text: String(opts.find((o) => o.name === 'message')?.value ?? ''),
      image: att && IMAGE.test(att.content_type ?? '') && att.size < 4_000_000 ? att : null,
    }
  } else {
    return Response.json({type: 4, data: {content: 'Unknown command.', flags: EPHEMERAL}})
  }

  const appId = i.application_id
  const token = i.token
  after(async () => {
    const edit = (body: object) =>
      fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)})
    try {
      if (!input) throw new Error('Could not read that message')
      const image = input.image ? await download(input.image) : null
      if (!input.text && !image) throw new Error('There is no text or image to check')
      const v = await check({text: input.text, image, source: 'discord', ...regionFor(String(i.locale ?? ''))})
      await saveVerdict(v)
      await edit(resultMessage(v, site))
    } catch (e) {
      const why = e instanceof Error ? e.message.replace(/\.$/, '') : 'something went wrong'
      await edit({content: `Red Flag couldn't check that: ${why}. If in doubt, don't click and don't log in through any link.`})
    }
  })
  return Response.json({type: 5, data: {flags: EPHEMERAL}})
}
