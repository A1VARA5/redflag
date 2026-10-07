// Per instance limiter. Good enough to stop one person draining the demo keys; not a security boundary.
const buckets = new Map<string, Map<string, number[]>>()

// True when `key` has used up its `max` hits in the window. Counts this hit otherwise.
export function overLimit(name: string, key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  let hits = buckets.get(name)
  if (!hits) buckets.set(name, (hits = new Map()))
  // Drop stale entries now and then so the map can't grow forever.
  if (hits.size > 5000) for (const [k, ts] of hits) if (now - ts[ts.length - 1] > windowMs) hits.delete(k)
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) return true
  recent.push(now)
  hits.set(key, recent)
  return false
}

export function rateLimited(req: Request, opts: {name: string; max: number; windowMs: number; message: string}): Response | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  return overLimit(opts.name, ip, opts.max, opts.windowMs) ? Response.json({error: opts.message}, {status: 429}) : null
}

// Telegram and Discord calls all come from their servers, so bots are limited per user, not per IP.
export const BOT_CHECKS_PER_10_MIN = 8
export const botLimited = (platform: string, userId: string | number | undefined) =>
  overLimit(`bot-${platform}`, String(userId ?? 'unknown'), BOT_CHECKS_PER_10_MIN, 10 * 60_000)
