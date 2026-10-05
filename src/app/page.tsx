import {Checker} from '@/components/Checker'
import {Flag} from '@/components/Flag'
import {blocklistMeta} from '@/lib/feeds'
import {latestRadar} from '@/lib/radar'
import patterns from '@/data/patterns.json'
import brands from '@/data/brands.json'

export const revalidate = 3600

export default async function Home() {
  const [bl, radar] = await Promise.all([blocklistMeta().catch(() => null), latestRadar().catch(() => null)])
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Flag /> Red Flag
        </a>
        <nav className="flex gap-5 text-sm text-ink-2">
          <a href="/radar" className="hover:text-ink">This week</a>
          <a href="/how" className="hover:text-ink">How it works</a>
          <a href="/eval" className="hidden hover:text-ink sm:inline">Test results</a>
        </nav>
      </header>

      <section className="pt-8 pb-8 sm:pt-14">
        <h1 className="max-w-3xl font-display text-[44px] leading-[1.02] tracking-tight sm:text-7xl">
          Not sure about a message? <span className="text-red">Show it to Red Flag.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
          It marks the exact words that give a scam away, checks every link without guessing, and tells you what to do in the next ten minutes. Free, no account, nothing saved unless you share it.
        </p>
      </section>

      <Checker />

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-4">
        <Fact n={bl ? bl.total.toLocaleString('en-GB') : '500k+'} label="known phishing sites and links, from 5 public blocklists, refreshed daily" />
        <Fact n={String((brands as unknown[]).length)} label="brands whose real domains it knows, so fakes stand out" />
        <Fact n={String((patterns as unknown[]).length)} label="scam patterns, each backed by an official warning" />
        <Fact n="UK · US · EU" label={radar ? `what to do and who to report to; this week's radar read ${radar.itemCount} reports` : 'what to do and who to report to'} />
      </dl>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        <Way title="Paste or screenshot" body="Texts, WhatsApps, DMs, emails. Drop a screenshot and Red Flag reads it." />
        <Way title="Forward the email" body={<>Forward any dodgy email to <span className="font-mono text-ink">redflag@homingbox.net</span> and the verdict comes back as a reply.</>} />
        <Way title="Right-click in Discord" body="Add the app, right-click a message, Apps → Red Flag this. Only you see the answer." />
      </section>
    </main>
  )
}

function Fact({n, label}: {n: string; label: string}) {
  return (
    <div className="bg-sheet p-4 sm:p-5">
      <dt className="font-display text-3xl tabular-nums sm:text-4xl">{n}</dt>
      <dd className="mt-1 text-xs leading-snug text-ink-2">{label}</dd>
    </div>
  )
}

function Way({title, body}: {title: string; body: React.ReactNode}) {
  return (
    <div className="rounded-2xl border border-rule bg-sheet p-5">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
    </div>
  )
}
