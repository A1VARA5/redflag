import type {Metadata} from 'next'
import {latestRadar} from '@/lib/radar'
import {External} from '@/components/Icons'
import {PageHero} from '@/components/PageHero'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: "This week's scams · Red Flag",
  description: 'The scams official bodies and real people are reporting right now, rebuilt every morning from public sources.',
}

const STATUS = {
  new: {label: 'New', cls: 'bg-danger-bg text-danger border-danger-line'},
  rising: {label: 'Rising', cls: 'bg-warn-bg text-warn border-warn-line'},
  ongoing: {label: 'Still going', cls: 'bg-muted-bg text-ink-2 border-line-2'},
} as const

export default async function RadarPage() {
  const r = await latestRadar()
  return (
    <main>
      <PageHero kicker="Going around right now" title="This week's scams" />
      <div className="site-width pt-10">
        {r ? (
          <>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{r.headline}</p>
            <p className="mt-2 text-[15px] text-ink-3">
              Rebuilt every morning from {r.feeds.filter((f) => f.ok).length} public sources ({r.itemCount} warnings and reports from the last three weeks).
              Updated {new Date(r.builtAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London'})} UK time.
            </p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
              {r.scams.map((s, i) => (
                <li key={i} className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[13px] font-semibold ${STATUS[s.status].cls}`}>{STATUS[s.status].label}</span>
                    <span className="text-[13px] text-ink-3">{s.regions.join(', ')}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold leading-snug">{s.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.what_happens}</p>
                  <dl className="mt-4 space-y-2 text-[15px]">
                    <div>
                      <dt className="inline font-semibold">Who it targets: </dt>
                      <dd className="inline text-ink-2">{s.who}</dd>
                    </div>
                    <div className="rounded-lg bg-danger-bg px-3 py-2">
                      <dt className="inline font-semibold text-danger">How to spot it: </dt>
                      <dd className="inline text-ink">{s.tell}</dd>
                    </div>
                  </dl>
                  <div className="min-h-5 flex-1" />
                  <ul className="space-y-1 border-t border-line pt-3 text-[13px]">
                    {s.sources.slice(0, 3).map((src) => (
                      <li key={src.url} className="truncate">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink-2 hover:text-navy hover:underline"
                        >
                          <External className="mr-1 inline h-3 w-3 align-[-1px]" />
                          {src.source}
                          {src.date ? `, ${src.date}` : ''}: {src.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-[13px] text-ink-3">Sources: {r.feeds.map((f) => `${f.name}${f.ok ? '' : ' (unavailable today)'}`).join(', ')}.</p>
          </>
        ) : (
          <p className="mt-3 text-ink-2">The first report is being put together. Check back in a few minutes.</p>
        )}
      </div>
    </main>
  )
}
