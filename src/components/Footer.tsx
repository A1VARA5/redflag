import Link from 'next/link'
import {Logo} from './Flag'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-[15px] text-ink-2 sm:grid-cols-[1.6fr_1fr_1.2fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm leading-relaxed">
            Red Flag is an automated checker and can be wrong. If money is involved, call your bank on the number on the back of your card, never one from the message.
          </p>
        </div>
        <div>
          <div className="font-semibold text-ink">Red Flag</div>
          <ul className="mt-3 space-y-2">
            <li><Link href="/" className="hover:text-ink">Check a message</Link></li>
            <li><Link href="/radar" className="hover:text-ink">This week&apos;s scams</Link></li>
            <li><Link href="/how" className="hover:text-ink">How it works</Link></li>
            <li><Link href="/eval" className="hover:text-ink">Test results</Link></li>
            <li><a href="https://github.com/A1VARA5/redflag" target="_blank" rel="noreferrer" className="hover:text-ink">Source code</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-ink">Report a scam</div>
          <ul className="mt-3 space-y-2">
            <li>UK: forward scam texts to <span className="font-medium text-ink">7726</span></li>
            <li><a href="https://www.reportfraud.police.uk/" target="_blank" rel="noreferrer" className="hover:text-ink">Report Fraud (UK)</a></li>
            <li><a href="https://reportfraud.ftc.gov/" target="_blank" rel="noreferrer" className="hover:text-ink">ReportFraud.ftc.gov (US)</a></li>
            <li><a href="https://www.europol.europa.eu/report-a-crime/report-cybercrime-online" target="_blank" rel="noreferrer" className="hover:text-ink">Report cybercrime in the EU</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-sm text-ink-3 sm:px-6">© 2026 Aivaras Navardauskas. Built for ForgeHacks 2026.</div>
      </div>
    </footer>
  )
}
