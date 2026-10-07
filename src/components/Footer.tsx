import Link from 'next/link'
import {Logo} from './Flag'
import {DISCORD_INVITE, TELEGRAM_BOT} from '@/lib/public-links'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-width footer-main">
        <div className="footer-about"><Logo /><p>An automated second opinion. If money is involved, contact your bank using a number you already trust.</p></div>
        <nav aria-label="Footer navigation"><Link href="/how">How it works & privacy</Link><Link href="/eval">Test results</Link><Link href="/radar">Scam radar</Link><a href={DISCORD_INVITE} target="_blank" rel="noreferrer">Add to Discord ↗</a><a href={TELEGRAM_BOT} target="_blank" rel="noreferrer">Telegram bot ↗</a><a href="https://github.com/A1VARA5/redflag" target="_blank" rel="noreferrer">Source code ↗</a></nav>
      </div>
      <div className="site-width footer-bottom"><span>Built by Aivaras Navardauskas · ForgeHacks 2026</span><details><summary>Report a scam</summary><div><a href="https://www.reportfraud.police.uk/" target="_blank" rel="noreferrer">Report Fraud · UK</a><a href="https://reportfraud.ftc.gov/" target="_blank" rel="noreferrer">FTC · US</a><a href="https://www.europol.europa.eu/report-a-crime/report-cybercrime-online" target="_blank" rel="noreferrer">Europol · EU</a><span>UK scam texts: forward to 7726</span></div></details></div>
    </footer>
  )
}
