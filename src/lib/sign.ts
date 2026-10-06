// Verdicts are signed when they are made, so a shared card cannot be forged.
// Without this, a scammer could post a hand-edited "No red flags found" card for their own scam.
import {createHmac, timingSafeEqual} from 'node:crypto'

const secret = () => {
  const s = process.env.REDFLAG_SECRET
  if (!s && process.env.NODE_ENV === 'production') throw new Error('REDFLAG_SECRET is not set')
  return s ?? 'local-dev-only'
}

export function sign(payload: object): string {
  return createHmac('sha256', secret()).update(JSON.stringify(payload)).digest('base64url')
}

export function verify(payload: object, sig: unknown): boolean {
  if (typeof sig !== 'string') return false
  const a = Buffer.from(sign(payload))
  const b = Buffer.from(sig)
  return a.length === b.length && timingSafeEqual(a, b)
}
