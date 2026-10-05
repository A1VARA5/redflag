import {Checker} from '@/components/Checker'
import {Flag} from '@/components/Flag'

export default function Home() {
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

      <section className="pt-8 pb-8 sm:pt-14">
        <h1 className="max-w-3xl font-display text-[44px] leading-[1.02] tracking-tight sm:text-7xl">
          Not sure about a message? <span className="text-red">Show it to Red Flag.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
          It marks the exact words that give a scam away, checks every link without guessing, and tells you what to do in the next ten minutes. Free, no account, nothing saved unless you share it.
        </p>
      </section>

      <Checker />

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        <Way title="Paste or screenshot" body="Texts, WhatsApps, DMs, emails. Drop a screenshot and Red Flag reads it." />
        <Way title="Forward the email" body={<>Forward any dodgy email to <span className="font-mono text-ink">redflag@homingbox.net</span> and the verdict comes back as a reply.</>} />
        <Way title="Right-click in Discord" body="Add the app, right-click a message, Apps → Red Flag this. Only you see the answer." />
      </section>
    </main>
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
