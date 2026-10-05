import respond from '@/data/respond.json'

export type Region = 'UK' | 'US' | 'EU'
export type Situation = 'received_only' | 'clicked_link' | 'entered_details' | 'paid_money' | 'gave_code_or_remote_access'

export const SITUATIONS: {id: Situation; label: string}[] = [
  {id: 'received_only', label: 'Just got it'},
  {id: 'clicked_link', label: 'I clicked the link'},
  {id: 'entered_details', label: 'I typed in details'},
  {id: 'paid_money', label: 'I paid'},
  {id: 'gave_code_or_remote_access', label: 'I gave a code or let them in'},
]

export type Channel = {id: string; name: string; how: string; url: string; source: string}
type Block = {steps: string[]; channels: string[]}
const R = respond as unknown as {channels: Record<string, Omit<Channel, 'id'>>} & Record<string, Record<string, Block>>

// What we know about the message, so we only show reporting channels that fit it.
export type Context = {text: string; impersonating: string | null; pattern: string | null; source: 'web' | 'email' | 'discord'; hasLinks: boolean}

const isEmail = (c: Context) => c.source === 'email' || /^(subject|from):/im.test(c.text)
const isText = (c: Context) => !isEmail(c) && c.source !== 'discord'
const about = (c: Context, re: RegExp) => re.test(`${c.text} ${c.impersonating ?? ''} ${c.pattern ?? ''}`)

const RELEVANT: Record<string, (c: Context) => boolean> = {
  uk_7726: isText,
  us_7726: isText,
  eu_fr_33700: isText,
  eu_pl_cert_8080: isText,
  uk_sers: isEmail,
  us_apwg: isEmail,
  uk_whatsapp_report: (c) => about(c, /whatsapp|hi[- ]?mum|new number/i),
  uk_hmrc: (c) => about(c, /hmrc|tax/i),
  us_irs: (c) => about(c, /\birs\b|tax/i),
  uk_royal_mail: (c) => about(c, /royal ?mail|parcelforce/i),
  us_uspis: (c) => about(c, /usps|postal service|package|parcel/i),
  uk_ncsc_website: (c) => c.hasLinks,
  uk_ncsc_hacked: (c) => about(c, /account|password|code|hack/i),
}

// Steps that just repeat a reporting channel; the channel card covers them with a link.
const COVERED = /7726|phishing\.gov\.uk|whatsapp|reportfraud\.ftc|33700|8080|reportphishing@|spam@uspis|phishing@irs|60599/i

export function respondFor(region: Region, situation: Situation, ctx?: Context): {steps: string[]; report: Channel[]} {
  const block = R[region]?.[situation] ?? R[region]?.received_only
  if (!block) return {steps: [], report: []}
  const report = [...new Set(block.channels)]
    .map((id) => (R.channels[id] ? {id, ...R.channels[id]} : null))
    .filter((c): c is Channel => Boolean(c))
    .filter((c) => !ctx || (RELEVANT[c.id]?.(ctx) ?? true))
  const steps = [...new Set(block.steps)].filter((s) => !COVERED.test(s))
  return {steps, report}
}

// Flat list for email and Discord replies: steps, then up to four reporting channels with links.
export function stepsFor(region: Region, situation: Situation, ctx?: Context): {text: string; url?: string}[] {
  const {steps, report} = respondFor(region, situation, ctx)
  return [...steps.map((text) => ({text})), ...report.slice(0, 4).map((c) => ({text: `${c.name}: ${c.how}`, url: c.url}))]
}
