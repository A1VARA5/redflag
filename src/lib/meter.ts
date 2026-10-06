// Daily spending cap for the Claude API. When today's spend passes the cap, checks go to the backup model.
// Kept per server instance (Vercel reuses a handful), so it is a guard rail, not exact accounting.
const CAP_USD = Number(process.env.REDFLAG_DAILY_USD ?? 6)

export const MODEL = process.env.REDFLAG_MODEL ?? 'claude-opus-5-5'

// Claude Opus 5.5 list prices, USD per million tokens.
const PRICE = {input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5}

let day = ''
let spent = 0

function today() {
  const d = new Date().toISOString().slice(0, 10)
  if (d !== day) {
    day = d
    spent = 0
  }
}

export function overBudget() {
  today()
  return spent >= CAP_USD
}

export function record(u: {input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null}) {
  today()
  const usd =
    ((u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) / 1e6
  spent += usd
  return usd
}

