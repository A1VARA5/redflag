// Link forensics. Everything in here is deterministic: no model, no guessing.
// The verdict model gets these findings as evidence, and they can force a verdict up (never down).
import {parse} from 'tldts'
import {domainToUnicode} from 'node:url'
import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import brands from '@/data/brands.json'
import {isKnownPhish} from './feeds'

export type Severity = 'high' | 'medium' | 'low' | 'info'
export type LinkFlag = {code: string; severity: Severity; detail: string}

export type LinkReport = {
  input: string
  url: string
  host: string
  domain: string | null
  finalUrl: string | null
  hops: string[]
  ageDays: number | null
  registered: string | null
  brand: string | null
  official: boolean
  flags: LinkFlag[]
}

type Brand = {brand: string; domains: string[]; keywords: string[]}
const BRANDS = brands as Brand[]

const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at',
  'rb.gy', 't.ly', 'tiny.cc', 'bl.ink', 'lnkd.in', 's.id', 'v.gd', 'qrco.de', 'shorturl.gg', 'urlz.fr', 'surl.li',
])

// TLDs that show up far more in phishing than in real brand mail. Weak signal on its own.
const RISKY_TLDS = new Set([
  'top', 'xyz', 'icu', 'cfd', 'sbs', 'click', 'live', 'shop', 'rest', 'bond', 'cyou', 'buzz', 'monster', 'quest',
  'zip', 'mov', 'lol', 'online', 'site', 'support', 'help', 'vip', 'win', 'loan', 'work', 'gq', 'tk', 'ml', 'cf', 'ga',
])

// Characters people use to fake letters. Folded before comparing against brand names.
const CONFUSABLE: Record<string, string> = {
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '$': 's', '@': 'a', '|': 'l', '!': 'i',
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ԁ': 'd', 'ɡ': 'g', 'ո': 'n',
  'ӏ': 'l', 'ѕ': 's', 'ԛ': 'q', 'ԝ': 'w', 'ı': 'i', 'ł': 'l', 'ö': 'o', 'ü': 'u', 'é': 'e', 'á': 'a',
}

function skeleton(s: string): string {
  let out = ''
  for (const ch of s.toLowerCase()) out += CONFUSABLE[ch] ?? ch
  return out.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd').replace(/[^a-z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const row = Array.from({length: b.length + 1}, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

// Finds links in a message, including defanged ones (hxxps://, [.], (dot)) and bare domains.
export function extractUrls(text: string): string[] {
  const refanged = text
    .replace(/hxxp/gi, 'http')
    .replace(/\[\.\]|\(\.\)|\{\.\}|\s?\[dot\]\s?|\s?\(dot\)\s?/gi, '.')
    .replace(/\[:\]/g, ':')
  const found = new Set<string>()
  const withScheme = /\bhttps?:\/\/[^\s<>"'`)\]]+/gi
  for (const m of refanged.matchAll(withScheme)) found.add(trimUrl(m[0]))
  const bare = /\b(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/[^\s<>"'`)\]]*)?/gi
  const stripped = refanged.replace(withScheme, ' ')
  for (const m of stripped.matchAll(bare)) {
    const candidate = trimUrl(m[0])
    const p = parse(candidate)
    // Only keep bare tokens that end in a real public suffix, so "e.g" and "file.txt" stay out.
    if (p.domain && p.isIcann && !/\.(txt|png|jpe?g|pdf|docx?|zip)$/i.test(candidate)) found.add('https://' + candidate)
  }
  return [...found].slice(0, 8)
}

function trimUrl(u: string) {
  return u.replace(/[.,;:!?)'"\]]+$/, '')
}

function brandFor(host: string, domain: string | null): {brand: Brand | null; official: boolean; flags: LinkFlag[]} {
  const flags: LinkFlag[] = []
  const lowHost = host.toLowerCase()
  for (const b of BRANDS) {
    if (b.domains.some((d) => lowHost === d || lowHost.endsWith('.' + d))) return {brand: b, official: true, flags}
  }
  if (!domain) return {brand: null, official: false, flags}
  const label = domain.split('.')[0]
  const skel = skeleton(label)
  // Brand names must start at a word boundary: "royal-mail-fees.com" and "secure-paypal.net" match,
  // "purchase.com" does not match "chase" and "pineapple.com" does not match "apple".
  const tokens = lowHost.split(/[.\-_]/).filter(Boolean).map(skeleton)
  const starts = tokens.map((_, i) => tokens.slice(i).join(''))
  for (const b of BRANDS) {
    for (const kw of b.keywords) {
      const k = skeleton(kw)
      if (k.length < 3) continue
      // Short names (ups, meta, apple) must be a whole word, or "metal.com" and "applebees.com" would match.
      const hit = k.length <= 5 ? tokens.includes(k) : starts.some((s) => s.startsWith(k))
      if (hit) {
        flags.push({
          code: 'brand-not-official',
          severity: 'high',
          detail: `Uses the name "${b.brand}" but ${domain} is not one of ${b.brand}'s real domains (${b.domains.slice(0, 3).join(', ')}).`,
        })
        return {brand: b, official: false, flags}
      }
    }
    for (const d of b.domains) {
      const realLabel = skeleton(d.split('.')[0])
      if (realLabel.length >= 5 && skel !== realLabel && levenshtein(skel, realLabel) <= (realLabel.length >= 8 ? 2 : 1)) {
        flags.push({
          code: 'lookalike-domain',
          severity: 'high',
          detail: `${domain} is one or two letters off ${d}. That is how fake sites hide.`,
        })
        return {brand: b, official: false, flags}
      }
    }
  }
  return {brand: null, official: false, flags}
}

const PRIVATE = /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|::1|fc|fd|fe80)/i

async function safeToFetch(host: string): Promise<boolean> {
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  try {
    const ip = isIP(host) ? host : (await lookup(host)).address
    return !PRIVATE.test(ip)
  } catch {
    return false
  }
}

// Follows redirects by hand with HEAD (then GET if refused), never reads bodies, max 5 hops.
async function unwrap(url: string): Promise<{finalUrl: string | null; hops: string[]; error: string | null}> {
  const hops: string[] = []
  let current = url
  for (let i = 0; i < 5; i++) {
    let u: URL
    try {
      u = new URL(current)
    } catch {
      return {finalUrl: null, hops, error: 'bad url'}
    }
    if (!(await safeToFetch(u.hostname))) return {finalUrl: current, hops, error: 'host not resolvable'}
    let res: Response
    try {
      res = await fetch(current, {method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(3500), headers: {'user-agent': 'Mozilla/5.0 (RedFlag link check)'}})
      if (res.status === 405 || res.status === 403) {
        res = await fetch(current, {method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(3500), headers: {'user-agent': 'Mozilla/5.0 (RedFlag link check)'}})
        res.body?.cancel().catch(() => {})
      }
    } catch {
      return {finalUrl: current, hops, error: i === 0 ? 'site did not answer' : null}
    }
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, current).toString()
      hops.push(next)
      current = next
      continue
    }
    return {finalUrl: current, hops, error: null}
  }
  return {finalUrl: current, hops, error: 'too many redirects'}
}

// Domain registration date from RDAP (the modern WHOIS). Free, no key.
async function domainAge(domain: string): Promise<{ageDays: number | null; registered: string | null}> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {signal: AbortSignal.timeout(4000), headers: {accept: 'application/rdap+json'}})
    if (!res.ok) return {ageDays: null, registered: null}
    const data = (await res.json()) as {events?: {eventAction: string; eventDate: string}[]}
    const reg = data.events?.find((e) => e.eventAction === 'registration')?.eventDate
    if (!reg) return {ageDays: null, registered: null}
    return {ageDays: Math.floor((Date.now() - Date.parse(reg)) / 86_400_000), registered: reg.slice(0, 10)}
  } catch {
    return {ageDays: null, registered: null}
  }
}

export async function inspectUrl(input: string): Promise<LinkReport> {
  const flags: LinkFlag[] = []
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return {input, url: input, host: '', domain: null, finalUrl: null, hops: [], ageDays: null, registered: null, brand: null, official: false, flags: [{code: 'unparseable', severity: 'low', detail: 'Could not read this link.'}]}
  }
  const host = url.hostname.toLowerCase()
  const unicodeHost = domainToUnicode(host)
  if (host.startsWith('xn--') || host.includes('.xn--')) {
    flags.push({code: 'punycode', severity: 'high', detail: `The address is encoded (${host}) and displays as "${unicodeHost}". Look-alike letters from other alphabets.`})
  }
  if (isIP(host)) flags.push({code: 'raw-ip', severity: 'high', detail: 'Link goes to a bare IP address, not a named website. Real companies do not do this.'})
  if (url.username || url.password || /@/.test(url.href.split('?')[0].replace(/^https?:\/\//, '').split('/')[0])) {
    flags.push({code: 'userinfo-trick', severity: 'high', detail: 'The link hides its real destination after an "@" sign.'})
  }
  if (url.protocol === 'http:') flags.push({code: 'no-https', severity: 'low', detail: 'Not encrypted (http, not https).'})

  const p = parse(host)
  const domain = p.domain ?? null
  if (p.publicSuffix && RISKY_TLDS.has(p.publicSuffix)) {
    flags.push({code: 'risky-tld', severity: 'medium', detail: `Ends in .${p.publicSuffix}, a cheap ending scammers use a lot.`})
  }
  if ((p.subdomain ?? '').split('.').length >= 3) {
    flags.push({code: 'deep-subdomain', severity: 'medium', detail: `Long chain of subdomains (${host}). Often used to push a brand name to the front.`})
  }
  const isShort = domain ? SHORTENERS.has(domain) || SHORTENERS.has(host) : false
  if (isShort) flags.push({code: 'shortener', severity: 'medium', detail: `Shortened link (${host}) hides where it really goes.`})

  const [{finalUrl, hops, error}, age] = await Promise.all([unwrap(url.toString()), domain ? domainAge(domain) : Promise.resolve({ageDays: null, registered: null})])

  let finalHost = host
  let finalDomain = domain
  if (finalUrl && finalUrl !== url.toString()) {
    try {
      finalHost = new URL(finalUrl).hostname.toLowerCase()
      finalDomain = parse(finalHost).domain ?? null
      if (finalDomain && finalDomain !== domain) flags.push({code: 'redirects-elsewhere', severity: isShort ? 'info' : 'medium', detail: `Redirects to a different site: ${finalHost}.`})
    } catch {}
  }
  if (error === 'host not resolvable') flags.push({code: 'dead-domain', severity: 'medium', detail: 'The domain does not resolve. Phishing sites get taken down fast, so this often means it was reported.'})

  const b = brandFor(finalHost, finalDomain)
  flags.push(...b.flags)
  if (age.ageDays !== null && !b.official) {
    if (age.ageDays < 30) flags.push({code: 'new-domain', severity: 'high', detail: `Registered ${age.ageDays} days ago (${age.registered}). Real companies' sites are years old.`})
    else if (age.ageDays < 180) flags.push({code: 'young-domain', severity: 'medium', detail: `Registered ${age.ageDays} days ago (${age.registered}).`})
  }
  const phish = await isKnownPhish([url.toString(), finalUrl ?? '', host, finalHost])
  if (phish) flags.push({code: 'known-phish', severity: 'high', detail: `On a public phishing blocklist (${phish}).`})
  if (b.official && flags.every((f) => f.severity !== 'high')) {
    flags.push({code: 'official-domain', severity: 'info', detail: `${finalHost} really belongs to ${b.brand?.brand}.`})
  }

  return {input, url: url.toString(), host, domain, finalUrl, hops, ageDays: age.ageDays, registered: age.registered, brand: b.brand?.brand ?? null, official: b.official, flags}
}

export async function inspectAll(text: string): Promise<LinkReport[]> {
  return Promise.all(extractUrls(text).map(inspectUrl))
}
