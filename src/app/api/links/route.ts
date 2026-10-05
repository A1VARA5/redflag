import {extractUrls, inspectUrl} from '@/lib/links'

export const maxDuration = 20

// Instant link check while someone types: code only, no AI, so it answers in about a second.
const hits = new Map<string, number[]>()

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (recent.length >= 40) return Response.json({error: 'Too many link checks. Wait a minute.'}, {status: 429})
  hits.set(ip, [...recent, now])

  const {text} = (await req.json().catch(() => ({}))) as {text?: string}
  const urls = extractUrls(String(text ?? '').slice(0, 60_000)).slice(0, 5)
  const links = await Promise.all(urls.map((u) => inspectUrl(u)))
  return Response.json({links})
}
