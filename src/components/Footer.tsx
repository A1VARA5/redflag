import {Flag} from './Flag'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 text-sm text-ink-2 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div>
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Flag /> Red Flag
          </div>
          <p className="mt-2 max-w-sm leading-relaxed">
            An automated checker. It can be wrong. If money is involved, call your bank on the number on the back of your card, not one in the message.
          </p>
        </div>
        <nav className="flex flex-col gap-1.5">
          <a href="/" className="hover:text-ink">Check a message</a>
          <a href="/radar" className="hover:text-ink">This week in scams</a>
          <a href="/how" className="hover:text-ink">How it works</a>
          <a href="/eval" className="hover:text-ink">Test results</a>
        </nav>
        <div className="flex flex-col gap-1.5">
          <span>UK: forward scam texts to 7726</span>
          <a href="https://www.reportfraud.police.uk/" target="_blank" rel="noreferrer" className="hover:text-ink">Report Fraud (UK) ↗</a>
          <a href="https://reportfraud.ftc.gov/" target="_blank" rel="noreferrer" className="hover:text-ink">ReportFraud.ftc.gov (US) ↗</a>
          <a href="https://www.europol.europa.eu/report-a-crime/report-cybercrime-online" target="_blank" rel="noreferrer" className="hover:text-ink">Report cybercrime in the EU ↗</a>
        </div>
      </div>
    </footer>
  )
}
