// Per-instance limiter. Good enough to stop one person draining the demo key; not a security boundary.
const hits = new Map<string, number[]>()
const WINDOW = 10 * 60_000
const MAX = Number(process.env.REDFLAG_RATE_MAX ?? 20)

export function rateLimited(req: Request): Response | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW)
  if (recent.length >= MAX) {
    return Response.json({error: 'Easy there. Twenty checks per ten minutes. Try again shortly.'}, {status: 429})
  }
  recent.push(now)
  hits.set(ip, recent)
  return null
}
