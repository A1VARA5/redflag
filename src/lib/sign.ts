// Verdicts are signed when they are made, so a shared card cannot be forged.
// Without this, a scammer could post a hand-edited "No red flags found" card for their own scam.
import {createHmac, timingSafeEqual} from 'node:crypto'

const secret = () => process.env.REDFLAG_SECRET ?? process.env.ANTHROPIC_API_KEY ?? 'dev'

export function sign(payload: object): string {
  return createHmac('sha256', secret()).update(JSON.stringify(payload)).digest('base64url')
}

export function verify(payload: object, sig: string): boolean {
  const a = Buffer.from(sign(payload))
  const b = Buffer.from(sig)
  return a.length === b.length && timingSafeEqual(a, b)
}
