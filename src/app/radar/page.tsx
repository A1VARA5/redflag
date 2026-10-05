import type {Metadata} from 'next'
import {latestRadar} from '@/lib/radar'
import {Flag} from '@/components/Flag'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {title: 'This week in scams · Red Flag', description: 'The scams official bodies and real people are reporting right now, rebuilt every morning from public sources.'}

const STATUS = {new: 'New', rising: 'Rising', ongoing: 'Still going'} as const
const STATUS_STYLE = {new: 'bg-red text-white', rising: 'bg-amber text-white', ongoing: 'bg-rule text-ink'} as const

export default async function RadarPage() {
  const r = await latestRadar()
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Flag /> Red Flag
        </a>
        <a href="/" className="rounded-full bg-red px-4 py-2 text-sm font-semibold text-white">Check a message</a>
      </header>
      <section className="pt-8 pb-8">
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">This week in scams</div>
        <h1 className="mt-2 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">{r?.headline ?? 'The radar is being built.'}</h1>
        {r && (
          <p className="mt-4 max-w-2xl text-ink-2">
            Rebuilt every morning from {r.feeds.filter((f) => f.ok).length} public sources ({r.itemCount} items from the last three weeks). Every card links to the reports it is based on. Updated{' '}
            {new Date(r.builtAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London'})} UK time.
          </p>
        )}
      </section>
      {r && (
        <ol className="grid gap-4 md:grid-cols-2">
          {r.scams.map((s, i) => (
            <li key={i} className="rise flex flex-col rounded-2xl border border-rule bg-sheet p-5" style={{animationDelay: `${i * 70}ms`}}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>{STATUS[s.status]}</span>
                <span className="font-mono text-[11px] text-ink-3">{s.regions.join(' · ')}</span>
              </div>
              <h2 className="mt-3 font-display text-3xl leading-tight">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-2">{s.what_happens}</p>
              <p className="mt-3 text-sm">
                <span className="font-semibold">Who: </span>
                <span className="text-ink-2">{s.who}</span>
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold text-red">The giveaway: </span>
                <span className="text-ink-2">{s.tell}</span>
              </p>
              <ul className="mt-auto space-y-1 border-t border-rule pt-3 text-xs">
                {s.sources.slice(0, 3).map((src) => (
                  <li key={src.url} className="truncate">
                    <a href={src.url} target="_blank" rel="noreferrer" className="text-ink-2 underline decoration-rule underline-offset-4 hover:decoration-ink">
                      {src.source}
                      {src.date ? ` · ${src.date}` : ''}: {src.title}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {r && (
        <p className="mt-10 font-mono text-[11px] text-ink-3">
          Sources: {r.feeds.map((f) => `${f.name}${f.ok ? '' : ' (unavailable)'}`).join(' · ')} · grouped by {r.model}
        </p>
      )}
    </main>
  )
}
