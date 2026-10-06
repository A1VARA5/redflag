import type {Metadata} from 'next'
import data from '../../../eval/results.json'
import {VERDICT_SHORT} from '@/lib/labels'

export const metadata: Metadata = {title: 'Test results · Red Flag', description: 'Red Flag against a public test set of scams, genuine messages and prompt-injection attacks, compared with a plain AI model. Every miss is listed.'}

type Row = {id: string; kind: string; set: string; text: string; redflag: string; confidence: number | null; baseline: string; redflag_correct: boolean; baseline_correct: boolean; headline: string; overrides: string[]; pattern_expected: string | null; pattern_got: string | null}
const {summary, results} = data as unknown as {
  summary: {ranAt: string; model: string; baselineModel: string; n: number; redflag: Record<string, number>; baseline: Record<string, number>; hard: {n: number; redflag: number; baseline: number}}
  results: Row[]
}

const pct = (x: number) => `${Math.round(x * 100)}%`
const KIND = {scam: 'Scam', legit: 'Genuine', injection: 'Injection attack'} as const
const CHIP: Record<string, string> = {
  scam: 'bg-danger-bg text-danger border-danger-line',
  suspicious: 'bg-warn-bg text-warn border-warn-line',
  unclear: 'bg-muted-bg text-ink-2 border-line-2',
  safe: 'bg-safe-bg text-safe border-safe-line',
  error: 'bg-muted-bg text-ink-2 border-line-2',
}
const WORD: Record<string, string> = {...VERDICT_SHORT, error: 'Error'}

function Chip({v}: {v: string}) {
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CHIP[v] ?? CHIP.error}`}>{WORD[v] ?? v}</span>
}

function Stat({label, rf, base, note}: {label: string; rf: number; base?: number; note: string}) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="text-[14px] font-semibold text-ink-2">{label}</div>
      <div className="mt-2 text-4xl font-bold tracking-tight">{pct(rf)}</div>
      {base !== undefined && <div className="mt-1 text-[14px] text-ink-3">Plain AI model: {pct(base)}</div>}
      <p className="mt-2 text-[14px] leading-snug text-ink-2">{note}</p>
    </div>
  )
}

export default function Eval() {
  const misses = results.filter((r) => !r.redflag_correct)
  const counts = (k: string, set?: string) => results.filter((r) => r.kind === k && (!set || r.set === set)).length
  const baseMisses = results.filter((r) => !r.baseline_correct)
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className="text-[34px] font-bold leading-tight tracking-tight sm:text-[42px]">Test results</h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-2">
        {summary.n} made-up messages, checked by Red Flag and, for comparison, by a capable AI model on its own ({summary.baselineModel}) with no link checks and no knowledge of known scams. Run on {new Date(summary.ranAt).toLocaleDateString('en-GB', {dateStyle: 'long'})}.
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-ink-2">
        <li>{counts('scam', 'core')} scams, one per known type</li>
        <li>{counts('legit', 'core')} genuine messages that look scary</li>
        <li>{counts('injection')} attempts to trick the checker</li>
        <li>{summary.hard.n} harder cases written separately</li>
      </ul>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Scams caught" rf={summary.redflag.scamsCaught} base={summary.baseline.scamsCaught} note="Marked as a scam or suspicious." />
        <Stat label="Tricks resisted" rf={summary.redflag.injectionsCaught} base={summary.baseline.injectionsCaught} note="Still called a scam when the message told the checker to say it was safe." />
        <Stat label="Genuine messages left alone" rf={summary.redflag.legitCleared} base={summary.baseline.legitCleared} note="Not flagged. False alarms teach people to ignore warnings." />
        <Stat label="Harder cases" rf={summary.hard.redflag} base={summary.hard.baseline} note="Written separately from the scam list Red Flag uses, so it isn't marking its own homework." />
      </div>
      <p className="mt-3 text-[14px] text-ink-3">The first three figures include the harder cases of that kind, so they cover more messages than the list above.</p>

      {baseMisses.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Where the plain AI model got it wrong</h2>
          <p className="mt-2 max-w-3xl text-[16px] text-ink-2">The same messages, given to a capable AI model with no link checks and no defence against tricks. These are the mistakes Red Flag is built to avoid.</p>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {baseMisses.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-card p-5">
                <div className="text-[13px] font-semibold text-ink-3">{KIND[r.kind as keyof typeof KIND]}</div>
                <p className="mt-2 line-clamp-4 text-[15px] leading-relaxed text-ink">{r.text}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[14px]">
                  <span className="flex items-center gap-2 text-ink-2">
                    Plain model <Chip v={r.baseline} />
                  </span>
                  <span className="flex items-center gap-2 text-ink-2">
                    Red Flag <Chip v={r.redflag} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Red Flag&apos;s misses</h2>
        {misses.length === 0 ? (
          <p className="mt-2 max-w-3xl text-[16px] text-ink-2">
            None in this run. That says more about the size of the test than about Red Flag: {summary.n} messages written for this project is a small sample, and it will get real messages wrong sometimes.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {misses.map((r) => (
              <li key={r.id} className="rounded-xl border border-warn-line bg-warn-bg p-4">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-semibold text-ink-2">{KIND[r.kind as keyof typeof KIND]}</span>
                  <Chip v={r.redflag} />
                </div>
                <p className="mt-2 text-[15px] text-ink">{r.text}</p>
                <p className="mt-1 text-[14px] text-ink-2">Its reasoning: {r.headline}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">All {summary.n} messages</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b border-line bg-bg text-[13px] text-ink-2">
              <tr>
                <th className="px-4 py-3 font-semibold">Message</th>
                <th className="px-4 py-3 font-semibold">Correct answer</th>
                <th className="px-4 py-3 font-semibold">Red Flag</th>
                <th className="px-4 py-3 font-semibold">Plain model</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="max-w-md px-4 py-3">
                    <div className="line-clamp-2 text-ink" title={r.text}>
                      {r.text}
                    </div>
                    {r.set === 'hard' && <span className="text-[12px] font-semibold text-ink-3">Harder case</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{KIND[r.kind as keyof typeof KIND]}</td>
                  <td className="px-4 py-3">
                    <Chip v={r.redflag} /> <span className={r.redflag_correct ? 'text-safe' : 'text-danger'}>{r.redflag_correct ? '✓' : '✗'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Chip v={r.baseline} /> <span className={r.baseline_correct ? 'text-safe' : 'text-danger'}>{r.baseline_correct ? '✓' : '✗'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-ink-3">
          The test set and the script that runs it are in the source code (eval/cases.json, scripts/eval.mts). All messages are made up; the scams are based on the official warnings each scam type cites.
        </p>
      </section>
    </main>
  )
}
