import {check, type CheckInput, type Region, type Situation} from '@/lib/verdict'
import {rateLimited} from '@/lib/ratelimit'
import {sign} from '@/lib/sign'

export const maxDuration = 60

const CHECKS_PER_10_MIN = Number(process.env.REDFLAG_RATE_MAX ?? 20)

const REGIONS = new Set(['UK', 'US', 'EU'])
const SITUATIONS = new Set(['received_only', 'clicked_link', 'entered_details', 'paid_money', 'gave_code_or_remote_access'])
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

// Streams newline-delimited JSON: {"type":"links"} as soon as the non-AI checks finish, then {"type":"verdict"} or {"type":"error"}.
export async function POST(req: Request) {
  const limited = rateLimited(req, {name: 'check', max: CHECKS_PER_10_MIN, windowMs: 10 * 60_000, message: `That's ${CHECKS_PER_10_MIN} checks in ten minutes. Please wait a few minutes and try again.`})
  if (limited) return limited
  let body: {text?: string; image?: {mediaType?: string; data?: string} | null; region?: string; situation?: string; country?: string}
  try {
    body = await req.json()
  } catch {
    return Response.json({error: 'Send JSON.'}, {status: 400})
  }
  const text = (body.text ?? '').toString().trim()
  const image = body.image?.data && IMAGE_TYPES.has(body.image.mediaType ?? '') ? body.image : null
  if (!text && !image) return Response.json({error: 'Paste a message or add a screenshot.'}, {status: 400})
  if (image && image.data!.length > 4_400_000) return Response.json({error: 'That screenshot is too big. Try a smaller one.'}, {status: 413})

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'))
      const input: CheckInput = {
        text,
        image: image ? {mediaType: image.mediaType as NonNullable<CheckInput['image']>['mediaType'], data: image.data!} : null,
        region: REGIONS.has(body.region ?? '') ? (body.region as Region) : 'UK',
        situation: SITUATIONS.has(body.situation ?? '') ? (body.situation as Situation) : 'received_only',
        source: 'web',
        onLinks: (links) => send({type: 'links', links}),
        country: /^[A-Z]{2}$/.test(body.country ?? '') ? body.country! : req.headers.get('x-vercel-ip-country'),
      }
      try {
        // Nothing is stored here. The message is kept only if the person chooses to share it.
        const verdict = await check(input)
        send({type: 'verdict', verdict, sig: sign(verdict)})
      } catch (e) {
        console.error('[check]', e)
        send({type: 'error', error: e instanceof Error ? e.message : 'Something went wrong.'})
      }
      controller.close()
    },
  })
  return new Response(stream, {headers: {'content-type': 'application/x-ndjson', 'cache-control': 'no-store'}})
}
