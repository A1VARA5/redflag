// The scam radar, rebuilt daily: what scams official bodies and real people are reporting right now.
// Built daily from public feeds (FTC, FBI IC3, NCSC, FCA, GOV.UK, Which?, Europol, CISA, r/Scams).
// Claude groups the items into this week's top scams; every claim must point at an item it was given.
import Anthropic from '@anthropic-ai/sdk'
import {betaZodOutputFormat} from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod/v4'
import {loadJson, saveJson} from './store'
import {MODEL} from './meter'
import patterns from '@/data/patterns.json'

const FEEDS = [
  {name: 'FTC Consumer Alerts', region: 'US', url: 'https://consumer.ftc.gov/blog/gd-rss.xml'},
  {name: 'FTC press releases', region: 'US', url: 'https://www.ftc.gov/feeds/press-release-consumer-protection.xml'},
  {name: 'FBI IC3', region: 'US', url: 'https://www.ic3.gov/PSA/RSS'},
  {name: 'NCSC', region: 'UK', url: 'https://www.ncsc.gov.uk/api/1/services/v1/news-rss-feed.xml'},
  {name: 'FCA', region: 'UK', url: 'https://www.fca.org.uk/news/rss.xml'},
  {name: 'GOV.UK', region: 'UK', url: 'https://www.gov.uk/search/news-and-communications.atom?keywords=scam'},
  {name: 'Which?', region: 'UK', url: 'https://www.which.co.uk/news/feed'},
  {name: 'Europol', region: 'EU', url: 'https://www.europol.europa.eu/rss.xml'},
  {name: 'CISA', region: 'US', url: 'https://www.cisa.gov/news.xml'},
  {name: 'r/Scams', region: 'global', url: 'https://www.reddit.com/r/Scams/new/.rss'},
]

export type FeedItem = {n: number; source: string; region: string; title: string; url: string; date: string | null; snippet: string}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim()

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? decode(m[1]) : ''
}

function parseFeed(xml: string, source: string, region: string): Omit<FeedItem, 'n'>[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  return blocks.map((b) => {
    const atomLink = b.match(/<link[^>]*href="([^"]+)"/i)?.[1]
    const url = tag(b, 'link') || atomLink || ''
    const rawDate = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')
    const d = rawDate ? new Date(rawDate) : null
    return {
      source,
      region,
      title: tag(b, 'title').slice(0, 200),
      url: decode(url),
      date: d && !isNaN(+d) ? d.toISOString().slice(0, 10) : null,
      snippet: (tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 280),
    }
  })
}

export async function collect(days = 21): Promise<{items: FeedItem[]; sources: {name: string; ok: boolean; count: number}[]}> {
  const cutoff = Date.now() - days * 86_400_000
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, {signal: AbortSignal.timeout(10_000), headers: {'user-agent': 'RedFlag-radar/1.0 (+https://getredflag.vercel.app)'}})
        if (!res.ok) return {name: f.name, ok: false, items: []}
        const items = parseFeed(await res.text(), f.name, f.region).filter((i) => i.url && i.title && (!i.date || Date.parse(i.date) >= cutoff))
        return {name: f.name, ok: true, items: items.slice(0, f.name === 'r/Scams' ? 25 : 15)}
      } catch {
        return {name: f.name, ok: false, items: []}
      }
    }),
  )
  const items = results.flatMap((r) => r.items).map((it, n) => ({...it, n}))
  return {items, sources: results.map((r) => ({name: r.name, ok: r.ok, count: r.items.length}))}
}

const Radar = z.object({
  headline: z.string().describe('One line summing up this week, plain English, max 16 words'),
  scams: z
    .array(
      z.object({
        title: z.string().describe('Short name of the scam as a person would say it'),
        status: z.enum(['new', 'rising', 'ongoing']),
        regions: z.array(z.enum(['UK', 'US', 'EU', 'global'])),
        pattern_id: z.string().nullable().describe('id from the known pattern list if it fits, else null'),
        what_happens: z.string().describe('How it works, max 45 words, plain English'),
        who: z.string().describe('Who is being targeted, max 12 words'),
        tell: z.string().describe('The single best giveaway, max 20 words'),
        evidence: z.array(z.number().int()).describe('Item numbers [n] that support this, at least one official source where possible'),
      }),
    )
    .describe('4 to 7 scams, most important first'),
})

export type RadarScam = z.infer<typeof Radar>['scams'][number] & {sources: Pick<FeedItem, 'source' | 'title' | 'url' | 'date'>[]}
export type RadarData = {builtAt: string; headline: string; scams: RadarScam[]; feeds: {name: string; ok: boolean; count: number}[]; itemCount: number; model: string}

export async function buildRadar(): Promise<RadarData> {
  const {items, sources} = await collect()
  const list = items.map((i) => `[${i.n}] ${i.source} (${i.region}${i.date ? ', ' + i.date : ''}): ${i.title}${i.snippet ? ' | ' + i.snippet : ''}`).join('\n')
  const client = new Anthropic()
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 6000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {effort: 'medium', format: betaZodOutputFormat(Radar)},
    system: `You write a daily scam radar for ordinary people. You get recent items from official bodies (FTC, FBI IC3, NCSC, FCA, GOV.UK, Europol, CISA), consumer journalism (Which?) and public victim posts (r/Scams).
Pick the 4 to 7 scams people are most likely to meet this week. Ignore items that are not about scams or fraud aimed at the public (corporate breaches, enforcement against firms, policy news) unless they warn the public about a live scam.
Every scam must cite the item numbers that support it. Never claim anything the items do not say. Prefer official sources; Reddit posts alone can support "people are reporting" but mark such scams "ongoing" unless an official item says new or rising.
Known pattern ids: ${(patterns as {id: string; name: string}[]).map((p) => `${p.id} (${p.name})`).join(', ')}.
Readers are in the UK, US and EU. Balance the regions where the items allow it, include UK scams whenever UK items support them, and say which region each scam is in.
Describe scam patterns people could meet, not single news stories about one victim.
British spelling, calm, no hype, plain sentences, no em or en dashes.`,
    messages: [{role: 'user', content: `Items from the last three weeks:\n${list}`}],
  })
  if (!res.parsed_output) throw new Error(`radar: no output (${res.stop_reason})`)
  const byN = new Map(items.map((i) => [i.n, i]))
  const scams = res.parsed_output.scams
    .map((s) => ({...s, sources: s.evidence.map((n) => byN.get(n)).filter(Boolean).map((i) => ({source: i!.source, title: i!.title, url: i!.url, date: i!.date}))}))
    .filter((s) => s.sources.length > 0)
  const data: RadarData = {builtAt: new Date().toISOString(), headline: res.parsed_output.headline, scams, feeds: sources, itemCount: items.length, model: res.model}
  await saveJson('radar/latest.json', data)
  return data
}

let cached: {at: number; data: RadarData | null} | null = null
export async function latestRadar(): Promise<RadarData | null> {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.data
  const data = await loadJson<RadarData>('radar/latest.json')
  cached = {at: Date.now(), data}
  return data
}
