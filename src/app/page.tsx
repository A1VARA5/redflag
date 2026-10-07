import {DISCORD_INVITE, TELEGRAM_BOT} from '@/lib/public-links'
import {HomeIntro} from '@/components/HomeIntro'
import {Checker} from '@/components/Checker'
import {EvidenceDemo} from '@/components/EvidenceDemo'
import {Pipeline} from '@/components/Landing'
import {Arrow, External, Mail, Chat} from '@/components/Icons'
import {blocklistMeta} from '@/lib/feeds'
import {latestRadar} from '@/lib/radar'
import patterns from '@/data/patterns.json'
import evalData from '../../eval/results.json'

export const revalidate = 3600

export default async function Home() {
  const [bl, radar] = await Promise.all([blocklistMeta().catch(() => null), latestRadar().catch(() => null)])
  const blocklistSize = bl ? bl.total.toLocaleString('en-GB') : 'over 550,000'
  const results = (evalData as unknown as {results: {set: string; redflag_correct: boolean}[]}).results.filter(r => r.set !== 'attack')
  const passed = results.filter(r => r.redflag_correct).length
  const latest = radar?.scams[0]

  return (
    <main className="home-page">
      <HomeIntro><Checker blocklistSize={blocklistSize} patternCount={patterns.length} /></HomeIntro>

      <section id="how-it-works" className="home-proof site-width" aria-labelledby="proof-title">
        <div className="compact-heading">
          <div><span className="eyebrow">BEHIND YOUR RESULT</span><h2 id="proof-title">See what raised the flag.</h2></div>
          <a href="/how" className="text-link">Inside the checks <Arrow className="h-4 w-4" /></a>
        </div>
        <Pipeline />
        <div className="proof-note"><p>No checker can promise a message is safe. We show the evidence and say when we’re unsure.</p><a href="/eval">{passed}/{results.length} synthetic tests passed<span className="proof-caveat">Invented cases, not a claim about real world accuracy.</span></a></div>
        <details className="example-disclosure" id="closer">
          <summary><span><span className="summary-title">Explore an example</span><span className="summary-detail">Email, PDF, screenshot or message</span></span><span className="disclosure-plus" aria-hidden>+</span></summary>
          <div className="example-layout"><div><h3>A familiar name isn’t proof.</h3><p>Choose a format. Move the divider to see the details that deserve a second look.</p><p className="example-caption">Illustrative examples. To try the real checker, use a sample above.</p></div><EvidenceDemo /></div>
        </details>
      </section>

      <section className="home-channels site-width" aria-labelledby="channels-title">
        <div className="compact-heading"><div><span className="eyebrow">WHEREVER IT REACHES YOU</span><h2 id="channels-title">Your inbox. Your community.</h2></div></div>
        <div className="compact-channels">
          <article><div className="channel-heading"><Mail className="h-6 w-6" /><h3>Forward an email.</h3></div><p>Send it to <a href="mailto:redflag@homingbox.net">redflag@homingbox.net</a>. Get the evidence back in a reply, attachments included.</p><a href="mailto:redflag@homingbox.net?subject=Is%20this%20a%20scam%3F" className="text-link">Open your email app <Arrow className="h-4 w-4" /></a></article>
          <article><div className="channel-heading"><Chat className="h-6 w-6" /><h3>Check it in Discord.</h3></div><p>Right click a message → Apps → Red Flag this. Or use <code>/redflag</code>. The result is private until you choose to warn the channel.</p><a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="text-link">Add to Discord <External className="h-4 w-4" /></a></article>
          <article><div className="channel-heading"><Chat className="h-6 w-6" /><h3>Ask it in Telegram.</h3></div><p>Forward a message, screenshot or PDF to the bot. In a group, reply to a message with <code>/check</code> and everyone sees the result.</p><a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="text-link">Open the bot <External className="h-4 w-4" /></a></article>
        </div>
        {latest && <a href="/radar" className="radar-brief"><span className="eyebrow">SCAM RADAR</span><span>{latest.title}</span><span className="radar-brief-action">See the latest warnings <Arrow className="h-4 w-4" /></span></a>}
      </section>
    </main>
  )
}
