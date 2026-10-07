// One row per check, built from what the link checks actually found, for the live progress list.
// Nothing here is a guess: a row only says "flagged" when that check flagged a link.
import type {LinkReport} from './links'

export type EvidenceRow = {id: string; label: string; state: 'flag' | 'clear' | 'skip'; detail: string}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function evidenceRows(links: LinkReport[], blocklistSize: string): EvidenceRow[] {
  if (!links.length) return []
  const has = (code: string) => links.filter((l) => l.flags.some((f) => f.code === code))
  const hosts = (ls: LinkReport[]) => [...new Set(ls.map((l) => l.host))].slice(0, 2).join(', ')
  const rows: EvidenceRow[] = []

  const listed = has('known-phish')
  rows.push(listed.length
    ? {id: 'blocklist', label: 'Phishing lists', state: 'flag', detail: `${hosts(listed)} is on a public phishing list`}
    : {id: 'blocklist', label: 'Phishing lists', state: 'clear', detail: `Not among ${blocklistSize} known phishing sites`})

  const google = has('google-safe-browsing')
  rows.push(google.length
    ? {id: 'google', label: 'Google Safe Browsing', state: 'flag', detail: `${hosts(google)} is listed as dangerous`}
    : {id: 'google', label: 'Google Safe Browsing', state: 'clear', detail: 'Not listed'})

  const fake = links.filter((l) => l.flags.some((f) => ['brand-not-official', 'lookalike-domain', 'punycode'].includes(f.code) && f.severity === 'high'))
  const official = links.filter((l) => l.official)
  rows.push(fake.length
    ? {id: 'brand', label: 'Real brand websites', state: 'flag', detail: `${hosts(fake)} is not ${fake[0].brand ?? 'the brand'}'s real site`}
    : official.length
      ? {id: 'brand', label: 'Real brand websites', state: 'clear', detail: `${hosts(official)} really belongs to ${official[0].brand}`}
      : {id: 'brand', label: 'Real brand websites', state: 'clear', detail: 'No brand name borrowed'})

  const aged = links.filter((l) => l.ageDays !== null)
  const young = aged.filter((l) => !l.official && (l.ageDays ?? 9999) < 180)
  rows.push(young.length
    ? {id: 'age', label: 'Domain age', state: 'flag', detail: `${young[0].host} was registered ${plural(young[0].ageDays!, 'day')} ago`}
    : aged.length
      ? {id: 'age', label: 'Domain age', state: 'clear', detail: `Registered ${aged[0].registered?.slice(0, 4) ?? 'years ago'}`}
      : {id: 'age', label: 'Domain age', state: 'skip', detail: "The registry didn't say"})

  const vt = links.filter((l) => l.vt)
  const vtBad = vt.filter((l) => l.vt!.malicious + l.vt!.suspicious > 0)
  rows.push(vtBad.length
    ? {id: 'virustotal', label: 'VirusTotal', state: 'flag', detail: `${vtBad[0].vt!.malicious + vtBad[0].vt!.suspicious} of ${vtBad[0].vt!.total} security engines flag ${vtBad[0].host}`}
    : vt.length
      ? {id: 'virustotal', label: 'VirusTotal', state: 'clear', detail: `0 of ${vt[0].vt!.total} engines flag it`}
      : {id: 'virustotal', label: 'VirusTotal', state: 'skip', detail: official.length === links.length ? 'Not needed for a real brand site' : 'No report for this link yet'})

  const dead = links.every((l) => l.flags.some((f) => f.code === 'dead-domain'))
  const scanned = links.filter((l) => l.scan)
  const scanBad = scanned.filter((l) => l.scan!.malicious)
  rows.push(scanBad.length
    ? {id: 'sandbox', label: 'Sandbox visit', state: 'flag', detail: `urlscan.io judged ${scanBad[0].host} malicious`}
    : scanned.length
      ? {id: 'sandbox', label: 'Sandbox visit', state: scanned.some((l) => l.scan!.pending) ? 'skip' : 'clear', detail: scanned.some((l) => l.scan!.pending) ? 'Page opened in a sandbox, screenshot on its way' : 'Opened in a sandbox, nothing flagged'}
      : {id: 'sandbox', label: 'Sandbox visit', state: 'skip', detail: official.length === links.length ? 'Not needed for a real brand site' : dead ? "The site doesn't load, so there was nothing to open" : 'Not available for this link'})

  return rows
}
