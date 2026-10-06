// Per instance limiter. Good enough to stop one person draining the demo keys; not a security boundary.
const buckets = new Map<string, Map<string, number[]>>()

export function rateLimited(req: Request, opts: {name: string; max: number; windowMs: number; message: string}): Response | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  let hits = buckets.get(opts.name)
  if (!hits) buckets.set(opts.name, (hits = new Map()))
  // Drop stale entries now and then so the map can't grow forever.
  if (hits.size > 5000) for (const [k, ts] of hits) if (now - ts[ts.length - 1] > opts.windowMs) hits.delete(k)
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < opts.windowMs)
  if (recent.length >= opts.max) return Response.json({error: opts.message}, {status: 429})
  recent.push(now)
  hits.set(ip, recent)
  return null
}
