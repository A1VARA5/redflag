import {Checker} from '@/components/Checker'
import {Arrow, Chat, Image as ImageIcon, Link as LinkIcon, Lock, Mail, ShieldCheck} from '@/components/Icons'
import {blocklistMeta} from '@/lib/feeds'
import {latestRadar} from '@/lib/radar'
import patterns from '@/data/patterns.json'
import brands from '@/data/brands.json'

export const revalidate = 3600

const DISCORD = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID ?? '1556639934457184256'}`

export default async function Home() {
  const [bl, radar] = await Promise.all([blocklistMeta().catch(() => null), latestRadar().catch(() => null)])
  const blocklistSize = bl ? bl.total.toLocaleString('en-GB') : '560,000'

  return (
    <main>
      <section className="border-b border-line bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-14 sm:px-6 sm:pt-16">
          <h1 className="max-w-3xl text-[34px] font-bold leading-[1.12] tracking-tight text-ink sm:text-[46px]">Got a message that doesn&apos;t feel right? Check it before you click.</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-2">
            Paste a text, email or DM, or add a screenshot. Red Flag shows you the exact words that give a scam away, checks every link, and tells you what to do next.
          </p>
          <div className="mt-8">
            <Checker blocklistSize={blocklistSize} patternCount={(patterns as unknown[]).length} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-x-10 gap-y-8 px-4 pt-14 sm:px-6 md:grid-cols-3">
        <Point icon={<LinkIcon className="h-5 w-5" />} title="Every link is checked">
          Against Google Safe Browsing and {blocklistSize} known phishing sites, with the domain&apos;s age and whether it really belongs to the brand it names. When a link is known to be bad, the answer is scam. No arguing.
        </Point>
        <Point icon={<ShieldCheck className="h-5 w-5" />} title="It shows its reasons">
          You see the exact words that give it away and why, so you learn to spot the next one yourself. It knows {(patterns as unknown[]).length} common scams and the real web addresses of {(brands as unknown[]).length} banks, couriers and services.
        </Point>
        <Point icon={<Lock className="h-5 w-5" />} title="Private by default">
          Nothing you paste is kept. A result is saved only if you share it, and shared results are signed so nobody can fake a &ldquo;no red flags&rdquo; result for their own scam.
        </Point>
      </section>

      {radar && radar.scams.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Going around this week</h2>
              <p className="mt-1 text-ink-2">From {radar.itemCount} recent warnings and reports by the FTC, FBI, NCSC, FCA, Europol and others.</p>
            </div>
            <a href="/radar" className="flex items-center gap-1.5 font-semibold text-navy hover:underline">
              See all {radar.scams.length} <Arrow className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {radar.scams.slice(0, 3).map((s) => (
              <li key={s.title} className="rounded-xl border border-line bg-card p-5">
                <div className="text-[13px] font-semibold text-ink-3">
                  {s.status === 'new' ? 'New' : s.status === 'rising' ? 'Rising' : 'Still going'} · {s.regions.join(', ')}
                </div>
                <h3 className="mt-1.5 text-lg font-semibold leading-snug">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.tell}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Check it wherever it arrives</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Way icon={<ImageIcon className="h-5 w-5" />} title="On this page">
            Paste the words, or add a screenshot of a text or WhatsApp. Works on your phone too.
          </Way>
          <Way icon={<Mail className="h-5 w-5" />} title="By email" cta={{href: 'mailto:redflag@homingbox.net?subject=Is%20this%20a%20scam%3F', label: 'Forward an email'}}>
            Forward the suspicious email to <span className="font-medium text-ink">redflag@homingbox.net</span>. The result comes back as a reply within a minute or two.
          </Way>
          <Way icon={<Chat className="h-5 w-5" />} title="In Discord" cta={{href: DISCORD, label: 'Add to Discord'}}>
            Right-click any message, then Apps, then <span className="font-medium text-ink">Red Flag this</span>. Only you see the answer, even in DMs from strangers.
          </Way>
        </div>
      </section>
    </main>
  )
}

function Point({icon, title, children}: {icon: React.ReactNode; title: string; children: React.ReactNode}) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{children}</p>
    </div>
  )
}

function Way({icon, title, children, cta}: {icon: React.ReactNode; title: string; children: React.ReactNode; cta?: {href: string; label: string}}) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-5">
      <div className="flex items-center gap-2.5 text-navy">
        {icon}
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</p>
      {cta && (
        <a
          href={cta.href}
          target={cta.href.startsWith('http') ? '_blank' : undefined}
          rel="noreferrer"
          className="mt-4 w-fit rounded-lg border border-line-2 px-3.5 py-2 text-[14px] font-semibold text-ink hover:border-ink"
        >
          {cta.label}
        </a>
      )}
    </div>
  )
}
