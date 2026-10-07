// Daily spending cap for the Claude API. When today's spend passes the cap, checks go to the backup model.
// Vercel runs several server instances at once, so each one writes its own running total for the day to
// storage and the cap is checked against all of them added up. One file per instance means no two instances
// ever write the same file, so nothing is lost to a race.
import {randomBytes} from 'node:crypto'
import {listKeys, loadJson, saveJson} from './store'

const CAP_USD = Number(process.env.REDFLAG_DAILY_USD ?? 6)

export const MODEL = process.env.REDFLAG_MODEL ?? 'claude-opus-5-5'

// Claude Opus 5.5 list prices, USD per million tokens.
const PRICE = {input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5}

const INSTANCE = randomBytes(6).toString('hex')
let day = ''
let spent = 0
let others: {at: number; usd: number} = {at: 0, usd: 0}

function today() {
  const d = new Date().toISOString().slice(0, 10)
  if (d !== day) {
    day = d
    spent = 0
    others = {at: 0, usd: 0}
  }
  return d
}

// What the other instances have spent today, re-read at most every 30 seconds.
async function othersSpent(): Promise<number> {
  if (Date.now() - others.at < 30_000) return others.usd
  try {
    const keys = (await listKeys(`meter/${day}/`)).filter((k) => !k.endsWith(`/${INSTANCE}.json`))
    const totals = await Promise.all(keys.map((k) => loadJson<{usd: number}>(k)))
    others = {at: Date.now(), usd: totals.reduce((sum, t) => sum + (Number(t?.usd) || 0), 0)}
  } catch (e) {
    // Storage down: keep the last known total rather than pretending nothing was spent.
    console.error('[meter] could not read other instances:', e instanceof Error ? e.message : e)
  }
  return others.usd
}

export async function overBudget(): Promise<boolean> {
  today()
  return spent + (await othersSpent()) >= CAP_USD
}

export async function record(u: {input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null}) {
  const d = today()
  const usd =
    ((u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) / 1e6
  spent += usd
  await saveJson(`meter/${d}/${INSTANCE}.json`, {usd: spent}).catch((e) => console.error('[meter] could not save:', e instanceof Error ? e.message : e))
  return usd
}
