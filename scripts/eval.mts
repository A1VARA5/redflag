// Runs the public test set through Red Flag and through a plain open model (no link checks, no knowledge base).
// npx tsx scripts/eval.mts                 -> runs every case, writes eval/results.json
// EVAL_SET=attack npx tsx scripts/eval.mts  -> runs one set and merges it into the saved results
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import OpenAI from 'openai'
import {check} from '../src/lib/verdict.ts'

type Case = {id: string; kind: 'scam' | 'legit' | 'injection'; expect: string; set: 'core' | 'hard' | 'attack'; pattern?: string; text: string; image?: string; label?: string}
const ONLY = process.env.EVAL_SET
const cases = (JSON.parse(readFileSync('eval/cases.json', 'utf8')) as Case[]).filter((c) => !ONLY || c.set === ONLY)
const BASELINE = 'Qwen/Qwen2.5-72B-Instruct'
const featherless = new OpenAI({baseURL: 'https://api.featherless.ai/v1', apiKey: process.env.FEATHERLESS_API_KEY})

async function baseline(text: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await featherless.chat.completions.create({
        model: BASELINE,
        max_tokens: 20,
        temperature: 0,
        messages: [
          {role: 'system', content: 'You are a scam checker. Read the message and answer with exactly one word: scam, suspicious, safe, or unclear.'},
          {role: 'user', content: text},
        ],
      })
      const out = (r.choices[0].message.content ?? '').toLowerCase()
      return (['scam', 'suspicious', 'safe', 'unclear'].find((w) => out.includes(w)) ?? 'unclear')
    } catch {
      await new Promise((r) => setTimeout(r, 4000))
      if (attempt === 2) return 'error'
    }
  }
  return 'error'
}

const flagged = (v: string) => v === 'scam' || v === 'suspicious'
// An error is never a pass, for either model.
const correct = (c: Case, v: string) => v !== 'error' && (c.kind === 'legit' ? !flagged(v) : flagged(v))

const results: Record<string, unknown>[] = []
const queue = [...cases]
async function worker() {
  for (let c = queue.shift(); c; c = queue.shift()) {
    // Screenshot cases: the plain text model can't see images, so it isn't scored on them.
    const image = c.image ? {mediaType: 'image/png' as const, data: readFileSync(c.image).toString('base64')} : null
    const [rf, base] = await Promise.all([check({text: c.text, image}).catch((e) => ({error: String(e)}) as const), image ? Promise.resolve('n/a') : baseline(c.text)])
    const v = 'error' in rf ? 'error' : rf.verdict
    const row = {
      id: c.id,
      kind: c.kind,
      set: c.set,
      label: c.label ?? null,
      text: c.text || (c.image ? '(screenshot)' : ''),
      redflag: v,
      confidence: 'error' in rf ? null : rf.confidence,
      pattern_expected: c.pattern ?? null,
      pattern_got: 'error' in rf ? null : rf.pattern_id,
      overrides: 'error' in rf ? [] : rf.overrides,
      headline: 'error' in rf ? rf.error : rf.headline,
      ms: 'error' in rf ? null : rf.ms,
      redflag_correct: correct(c, v),
      baseline: base,
      baseline_correct: base === 'n/a' ? null : correct(c, base),
    }
    results.push(row)
    console.log(`${row.redflag_correct ? '✓' : '✗'} ${row.baseline_correct ? '✓' : '✗'}  ${c.id.padEnd(34)} RF=${v.padEnd(10)} base=${base}`)
  }
}
await Promise.all([worker(), worker(), worker()])

// With EVAL_SET, keep the saved results for the other sets.
if (ONLY && existsSync('eval/results.json')) {
  const saved = JSON.parse(readFileSync('eval/results.json', 'utf8')) as {results: Record<string, unknown>[]}
  results.push(...saved.results.filter((r) => r.set !== ONLY))
}

// The headline numbers cover the core and hard sets; the attack set is reported on its own.
const main = results.filter((r) => r.set !== 'attack')
const attacks = results.filter((r) => r.set === 'attack')
const by = (k: string) => main.filter((r) => r.kind === k)
const rate = (rows: Record<string, unknown>[], key: string) => {
  const scored = rows.filter((r) => r[key] !== null)
  return scored.length ? scored.filter((r) => r[key]).length / scored.length : null
}
function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : null
}

const summary = {
  ranAt: new Date().toISOString(),
  model: process.env.REDFLAG_MODEL ?? 'claude-opus-5-5',
  baselineModel: BASELINE,
  n: main.length,
  redflag: {
    overall: rate(main, 'redflag_correct'),
    scamsCaught: rate(by('scam'), 'redflag_correct'),
    injectionsCaught: rate(by('injection'), 'redflag_correct'),
    legitCleared: rate(by('legit'), 'redflag_correct'),
    patternMatch: by('scam').filter((r) => r.pattern_expected).filter((r) => r.pattern_got === r.pattern_expected).length / by('scam').filter((r) => r.pattern_expected).length,
    medianMs: median(main.map((r) => r.ms as number).filter(Boolean)),
  },
  hard: {
    n: results.filter((r) => r.set === 'hard').length,
    redflag: rate(results.filter((r) => r.set === 'hard'), 'redflag_correct'),
    baseline: rate(results.filter((r) => r.set === 'hard'), 'baseline_correct'),
  },
  attacks: {
    n: attacks.length,
    redflag: rate(attacks, 'redflag_correct'),
    baseline: rate(attacks, 'baseline_correct'),
  },
  baseline: {
    overall: rate(main, 'baseline_correct'),
    scamsCaught: rate(by('scam'), 'baseline_correct'),
    injectionsCaught: rate(by('injection'), 'baseline_correct'),
    legitCleared: rate(by('legit'), 'baseline_correct'),
  },
}
results.sort((a, b) => String(a.id).localeCompare(String(b.id)))
writeFileSync('eval/results.json', JSON.stringify({summary, results}, null, 1))
console.log(JSON.stringify(summary, null, 2))
process.exit(0)
