import {Checker} from '@/components/Checker'
import {PhoneDemo} from '@/components/PhoneDemo'
import {Reveal} from '@/components/Reveal'
import {Channels, HouseRules, Pipeline, SectionTitle, Stats, Tricks} from '@/components/Landing'
import {Arrow} from '@/components/Icons'
import {blocklistMeta} from '@/lib/feeds'
import {latestRadar} from '@/lib/radar'
import patterns from '@/data/patterns.json'
import brands from '@/data/brands.json'
import respond from '@/data/respond.json'
import evalData from '../../eval/results.json'

export const revalidate = 3600

const DISCORD = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID ?? '1556639934457184256'}`

export default async function Home() {
  const [bl, radar] = await Promise.all([blocklistMeta().catch(() => null), latestRadar().catch(() => null)])
  const blocklistSize = bl ? bl.total.toLocaleString('en-GB') : 'over 550,000'
  const sites = bl ? `${Math.floor(bl.total / 1000)}k+` : '550k+'
  const channels = Object.keys((respond as unknown as {channels: object}).channels).length
  const results = (evalData as unknown as {results: {set: string; redflag_correct: boolean}[]}).results.filter((r) => r.set !== 'attack')
  const passed = results.filter((r) => r.redflag_correct).length

  return (
    <main>
      <section className="hero">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-32 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-40">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[13px] text-white/80">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#ff6b5f]" />
              Free scam checker for the web, email and Discord
            </div>
            <h1 className="mt-5 text-balance text-[38px] font-bold leading-[1.06] tracking-tight text-white sm:text-[56px]">
              Got a message that doesn&apos;t feel right?
              <span className="mt-1 block text-[#ff8a80]">Check it before you click.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-white/75">
              Paste a text, DM or email, or drop a screenshot or PDF. Red Flag marks the exact words that give a scam away, checks every link for real, and tells you what to do next. In about ten seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#check" className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[#0f2a47] shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)] hover:bg-white/90">
                Check a message <Arrow className="h-4 w-4" />
              </a>
              <a href={DISCORD} target="_blank" rel="noreferrer" className="rounded-xl border border-white/20 px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/10">
                Add to Discord
              </a>
            </div>
            <p className="mt-8 text-[13px] text-white/55">Checked against Google Safe Browsing · VirusTotal · urlscan.io · {blocklistSize} known phishing sites</p>
          </div>
          <div className="hidden lg:block">
            <PhoneDemo />
          </div>
        </div>
      </section>

      <section id="check" className="relative z-10 mx-auto -mt-24 w-full max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:-mt-28">
        <div className="rounded-3xl border border-line bg-card p-5 shadow-[0_30px_80px_-30px_rgba(7,21,38,0.45)] sm:p-8 dark:border-white/10 dark:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px] font-bold tracking-tight">Check a message</h2>
            <span className="text-[14px] text-ink-3">Free. No sign up. Nothing kept unless you share.</span>
          </div>
          <Checker blocklistSize={blocklistSize} patternCount={(patterns as unknown[]).length} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
        <Stats
          items={[
            {value: sites, label: 'known phishing sites, rebuilt every day'},
            {value: String((patterns as unknown[]).length), label: 'scam types, each from an official warning'},
            {value: String((brands as unknown[]).length), label: 'banks, couriers and apps with their real domains'},
            {value: String(channels), label: 'official places to report, UK, US and EU'},
            {value: `${passed}/${results.length}`, label: 'on the public test set'},
          ]}
        />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
        <SectionTitle kicker="Tricks it catches" title="Scammers hide things. Red Flag finds them.">
          The words are only half of it. These are the tricks built to fool you, your spam filter and AI checkers, and what Red Flag does about each one.
        </SectionTitle>
        <Tricks />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
        <SectionTitle kicker="How it works" title="Evidence beats vibes.">
          A chatbot can be talked round by the very message it&apos;s checking. A blocklist can&apos;t. So the hard checks run first, and they can overrule the AI, but only towards danger.
        </SectionTitle>
        <Pipeline />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
        <SectionTitle kicker="Wherever it arrives" title="Three ways in. Nothing to install.">
          Scams don&apos;t only come by text. Check them where they land, and warn your whole Discord server in one tap.
        </SectionTitle>
        <Channels discord={DISCORD} />
      </section>

      {radar && radar.scams.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle kicker="Going around right now" title="This week's scams.">
              From {radar.itemCount} recent warnings by the FTC, FBI, NCSC, FCA, Europol and others, updated every day.
            </SectionTitle>
            <a href="/radar" className="flex items-center gap-1.5 font-semibold text-navy hover:underline">
              See all {radar.scams.length} <Arrow className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {radar.scams.slice(0, 3).map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 80} className="lift rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className={`rounded-full px-2 py-0.5 ${s.status === 'new' ? 'bg-danger-bg text-danger' : s.status === 'rising' ? 'bg-warn-bg text-warn' : 'bg-muted-bg text-ink-2'}`}>
                    {s.status === 'new' ? 'New' : s.status === 'rising' ? 'Rising' : 'Still going'}
                  </span>
                  <span className="text-ink-3">{s.regions.map((r) => (r === 'global' ? 'Global' : r)).join(', ')}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold leading-snug">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.tell}</p>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
        <div className="hero overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <Reveal>
              <h2 className="text-[30px] font-bold leading-tight tracking-tight text-white sm:text-[40px]">Five seconds. One paste. No guessing.</h2>
              <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-white/70">The message lands and there&apos;s nobody to ask. Now there is.</p>
              <a href="#check" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[#0f2a47] hover:bg-white/90">
                Check a message <Arrow className="h-4 w-4" />
              </a>
            </Reveal>
            <div className="rounded-2xl bg-white p-6 [--card:#fff] [--ink-2:#44505f] [--safe:#0f6b46]">
              <HouseRules />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
