import {extractUrls, inspectUrl} from '@/lib/links'
import {rateLimited} from '@/lib/ratelimit'

export const maxDuration = 20

// Instant link check while someone types: code only, no AI, so it answers in about a second.
export async function POST(req: Request) {
  const limited = rateLimited(req, {name: 'links', max: 40, windowMs: 60_000, message: 'Too many link checks. Wait a minute.'})
  if (limited) return limited
  const {text} = (await req.json().catch(() => ({}))) as {text?: string}
  const urls = extractUrls(String(text ?? '').slice(0, 60_000)).slice(0, 5)
  const links = await Promise.all(urls.map((u) => inspectUrl(u)))
  return Response.json({links})
}
