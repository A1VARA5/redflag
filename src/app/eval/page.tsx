import type {Metadata} from 'next'
import data from '../../../eval/results.json'
import {Flag} from '@/components/Flag'

export const metadata: Metadata = {title: 'Test results · Red Flag', description: 'Red Flag against a public test set of scams, genuine messages and prompt-injection attacks, compared with a plain open model. Every miss is listed.'}

type Row = {id: string; kind: string; set: string; text: string; redflag: string; confidence: number | null; baseline: string; redflag_correct: boolean; baseline_correct: boolean; headline: string; overrides: string[]; pattern_expected: string | null; pattern_got: string | null}
const {summary, results} = data as unknown as {
  summary: {ranAt: string; model: string; baselineModel: string; n: number; redflag: Record<string, number>; baseline: Record<string, number>; hard: {n: number; redflag: number; baseline: number}}
  results: Row[]
}

const pct = (x: number) => `${Math.round(x * 100)}%`
const KIND = {scam: 'Scam', legit: 'Genuine', injection: 'Injection attack'} as const
const CHIP: Record<string, string> = {scam: 'bg-red text-white', suspicious: 'bg-amber text-white', unclear: 'bg-slate-wash text-slate', safe: 'bg-calm-wash text-calm', error: 'bg-rule text-ink'}

function Stat({label, rf, base, note}: {label: string; rf: number; base?: number; note: string}) {
  return (
    <div className="rounded-2xl border border-rule bg-sheet p-5">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="font-display text-6xl leading-none">{pct(rf)}</span>
      </div>
      {base !== undefined && <div className="mt-1 font-mono text-xs text-ink-3">plain model {pct(base)}</div>}
      <p className="mt-2 text-sm text-ink-2">{note}</p>
    </div>
  )
}

export default function Eval() {
  const misses = results.filter((r) => !r.redflag_correct)
  const counts = (k: string, set?: string) => results.filter((r) => r.kind === k && (!set || r.set === set)).length
  const baseMisses = results.filter((r) => !r.baseline_correct)
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Flag /> Red Flag
        </a>
        <nav className="flex gap-5 text-sm text-ink-2">
          <a href="/radar" className="hover:text-ink">This week</a>
          <a href="/how" className="hover:text-ink">How it works</a>
        </nav>
      </header>

      <h1 className="pt-8 font-display text-6xl leading-[1.02]">Test results</h1>
      <p className="mt-4 max-w-3xl text-lg text-ink-2">
        {summary.n} made-up messages: {counts('scam', 'core')} scams (one per known pattern), {counts('legit', 'core')} genuine messages chosen to look scary (a real bank fraud alert, a genuine Royal Mail customs fee, 2FA codes), {counts('injection')} prompt-injection attacks, and {summary.hard.n} hard cases written separately (below) that try to talk the checker into saying &ldquo;safe&rdquo;. The same messages went to a plain open model ({summary.baselineModel}, one-word answer, no link checks) for comparison. Run {new Date(summary.ranAt).toLocaleDateString('en-GB', {dateStyle: 'medium'})}.
      </p>

      <div className="mt-8 rounded-2xl border-2 border-ink bg-sheet p-5 sm:p-6">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">The honest number: {summary.hard.n} hard cases written separately from the knowledge base</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="font-display text-7xl leading-none">{pct(summary.hard.redflag)}</span>
          <span className="font-mono text-sm text-ink-3">plain model {pct(summary.hard.baseline)}</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">
          The core scams below were written from the same pattern list Red Flag reads, so they are partly a test of its own homework. These were not: link-free invoice fraud, fake recruiters, CEO gift-card requests, &ldquo;wrong number&rdquo; openers, and genuine messages that sound urgent.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Scams caught" rf={summary.redflag.scamsCaught} base={summary.baseline.scamsCaught} note="Marked scam or suspicious." />
        <Stat label="Injections resisted" rf={summary.redflag.injectionsCaught} base={summary.baseline.injectionsCaught} note="Still called a scam despite text telling the checker to say safe." />
        <Stat label="Genuine left alone" rf={summary.redflag.legitCleared} base={summary.baseline.legitCleared} note="Not marked scam or suspicious. False alarms teach people to ignore warnings." />
        <Stat label="Right scam named" rf={summary.redflag.patternMatch} note={`Matched the exact pattern it was written for. Median time ${(summary.redflag.medianMs / 1000).toFixed(1)}s.`} />
      </div>

      {baseMisses.length > 0 && (
        <>
          <h2 className="mt-14 font-display text-4xl">Where a plain AI model got it wrong</h2>
          <p className="mt-2 max-w-3xl text-ink-2">Same messages, asked to a capable open model with no link checks, no knowledge base and no defence against injection. These are the kind of mistakes Red Flag is built to avoid.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {baseMisses.map((r) => (
              <li key={r.id} className="rounded-2xl border border-rule bg-sheet p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-rule px-2 py-0.5">{KIND[r.kind as keyof typeof KIND]}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${CHIP[r.baseline] ?? CHIP.error}`}>plain model: {r.baseline}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${CHIP[r.redflag]}`}>Red Flag: {r.redflag}</span>
                </div>
                <p className="mt-2 line-clamp-4 text-sm text-ink-2">{r.text}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-14 font-display text-4xl">Every miss</h2>
      {misses.length === 0 ? (
        <p className="mt-3 text-ink-2">None on this run. That says more about the size of the test set than about Red Flag: it will get things wrong.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {misses.map((r) => (
            <li key={r.id} className="rounded-2xl border-2 border-dashed border-ink-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-ink-3">{r.id}</span>
                <span className="rounded-full bg-rule px-2 py-0.5">{KIND[r.kind as keyof typeof KIND]}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${CHIP[r.redflag]}`}>Red Flag said {r.redflag}</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">{r.text}</p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">Its reasoning: </span>
                {r.headline}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-14 font-display text-4xl">All {summary.n} cases</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-sheet">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <tr className="border-b border-rule">
              <th className="p-3">Case</th>
              <th className="p-3">Type</th>
              <th className="p-3">Red Flag</th>
              <th className="p-3">Plain model</th>
              <th className="p-3">Checks overruled AI</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b border-rule last:border-0">
                <td className="p-3 font-mono text-xs" title={r.text}>
                  {r.id}
                  {r.set === 'hard' && <span className="ml-1.5 rounded bg-ink px-1 py-px text-[9px] text-paper">HARD</span>}
                </td>
                <td className="p-3">{KIND[r.kind as keyof typeof KIND]}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[r.redflag]}`}>{r.redflag}</span> {r.redflag_correct ? '✓' : '✗'}
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[r.baseline] ?? CHIP.error}`}>{r.baseline}</span> {r.baseline_correct ? '✓' : '✗'}
                </td>
                <td className="p-3 text-xs text-ink-2">{r.overrides.length ? 'yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Test set and runner are in the repo (eval/cases.json, scripts/eval.mts). Scam examples are synthetic and based on the official warnings each pattern cites. Model: {summary.model}.
      </p>
    </main>
  )
}
