// Discord: right-click any message > Apps > "Red Flag this". HTTP interactions, no gateway bot.
// Discord wants an answer within 3 s, so we defer (ephemeral) and edit the reply when the verdict is ready.
import {after} from 'next/server'
import {createPublicKey, verify as edVerify} from 'node:crypto'
import {check} from '@/lib/verdict'
import {saveVerdict} from '@/lib/store'

export const maxDuration = 60

const WORD = {scam: 'SCAM', suspicious: 'SUSPICIOUS', unclear: "CAN'T TELL", safe: 'NO RED FLAGS FOUND'} as const
const COLOR = {scam: 0xd7261e, suspicious: 0xe08a00, unclear: 0x4a5568, safe: 0x2f6b4f} as const
const EPHEMERAL = 64

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
type Msg = {content: string; attachments?: Attachment[]; embeds?: {title?: string; description?: string; url?: string}[]; author?: {username: string}}

export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyDiscord(raw, req.headers.get('x-signature-ed25519'), req.headers.get('x-signature-timestamp'))) {
    return new Response('bad signature', {status: 401})
  }
  const i = JSON.parse(raw)
  if (i.type === 1) return Response.json({type: 1}) // PING

  if (i.type === 2 && i.data?.type === 3) {
    const msg: Msg | undefined = i.data.resolved?.messages?.[i.data.target_id]
    const appId = i.application_id
    const token = i.token
    after(async () => {
      const edit = (body: object) =>
        fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)})
      try {
        if (!msg) throw new Error('Could not read that message.')
        const embedText = (msg.embeds ?? []).map((e) => [e.title, e.description, e.url].filter(Boolean).join('\n')).join('\n')
        const text = [msg.content, embedText].filter(Boolean).join('\n\n')
        const img = msg.attachments?.find((a) => /^image\/(png|jpeg|webp|gif)/.test(a.content_type ?? '') && a.size < 4_000_000)
        let image = null
        if (img) {
          const r = await fetch(img.url, {signal: AbortSignal.timeout(8000)})
          if (r.ok) image = {mediaType: (img.content_type!.split(';')[0]) as 'image/png', data: Buffer.from(await r.arrayBuffer()).toString('base64')}
        }
        if (!text && !image) throw new Error('That message has no text or image to check.')
        const v = await check({text, image, source: 'discord', region: 'UK'})
        await saveVerdict(v)
        const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
        const links = v.links.flatMap((l) => l.flags.filter((f) => f.severity === 'high').map((f) => `\`${l.host}\` ${f.detail}`)).slice(0, 3)
        await edit({
          embeds: [
            {
              title: `${WORD[v.verdict]}${v.verdict === 'scam' || v.verdict === 'suspicious' ? ` · ${v.confidence}% sure` : ''}`,
              description: `**${v.headline}**\n${v.summary}`,
              color: COLOR[v.verdict],
              fields: [
                ...(v.red_flags.length ? [{name: 'Warning signs', value: v.red_flags.slice(0, 5).map((f, n) => `${n + 1}. "${f.quote}" ${f.why}`).join('\n').slice(0, 1024)}] : []),
                ...(links.length ? [{name: 'Link check (no AI)', value: links.join('\n').slice(0, 1024)}] : []),
                ...(v.overrides.length ? [{name: 'Checks overruled the AI', value: v.overrides.join(' ').slice(0, 1024)}] : []),
                {name: 'Check it yourself', value: v.check_it_yourself.slice(0, 1024)},
              ],
              footer: {text: 'Red Flag can be wrong. Only you can see this.'},
            },
          ],
          components: [{type: 1, components: [{type: 2, style: 5, label: 'Full marked-up report', url: `${site}/v/${v.id}`}]}],
        })
      } catch (e) {
        await edit({content: `Red Flag couldn't check that: ${e instanceof Error ? e.message : 'something went wrong'}. If in doubt, don't click and don't log in through any link.`})
      }
    })
    return Response.json({type: 5, data: {flags: EPHEMERAL}})
  }
  return Response.json({type: 4, data: {content: 'Unknown command.', flags: EPHEMERAL}})
}
