// Phishing blocklists. Two layers:
// 1. A combined list of ~600k known phishing hosts and URLs from five public feeds, rebuilt daily by a cron job
//    and split into 64 hashed shards in private storage. A lookup loads only the one shard it needs.
// 2. The OpenPhish feed fetched live (every 30 min per server), so the last few hours are covered too.
import {createHash} from 'node:crypto'
import {loadJson, saveJson} from './store'
import brands from '@/data/brands.json'

// Platforms where one host serves many people's content: only the exact URL can be blocked.
const PATH_PLATFORMS =
  /^(google\.com|docs\.google\.com|sites\.google\.com|drive\.google\.com|forms\.gle|storage\.googleapis\.com|firebasestorage\.googleapis\.com|dropbox\.com|dl\.dropboxusercontent\.com|onedrive\.live\.com|1drv\.ms|ipfs\.io|telegra\.ph|linktr\.ee|bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|s3\.amazonaws\.com|raw\.githubusercontent\.com|github\.com|gitlab\.com|vercel\.app|netlify\.app|pages\.dev|workers\.dev|web\.app|firebaseapp\.com|github\.io|blogspot\.com|wixsite\.com|weebly\.com|webflow\.io|glitch\.me|replit\.app|framer\.app|notion\.site|canva\.site|r2\.dev|wordpress\.com|square\.site|azurewebsites\.net|000webhostapp\.com|godaddysites\.com|mystrikingly\.com|jimdosite\.com)$/
// Platforms that hand each customer their own subdomain (name.vercel.app): that subdomain belongs to one person, so it can be blocked whole.
const SUBDOMAIN_PLATFORMS =
  /\.(vercel\.app|netlify\.app|pages\.dev|workers\.dev|web\.app|firebaseapp\.com|github\.io|blogspot\.com|wixsite\.com|weebly\.com|webflow\.io|glitch\.me|replit\.app|framer\.app|notion\.site|canva\.site|r2\.dev|wordpress\.com|square\.site|azurewebsites\.net|000webhostapp\.com|godaddysites\.com|mystrikingly\.com|jimdosite\.com|herokuapp\.com|onrender\.com|fly\.dev|surge\.sh|translate\.goog)$/
// Kept for the link checker: hosts where a blocklist hit on the host alone means little.
export const SHARED_HOSTING = PATH_PLATFORMS
const urlOnly = (host: string) => PATH_PLATFORMS.test(host) || (/\.(google|googleusercontent|amazonaws|sharepoint|dropbox)\.com$/.test(host) && !SUBDOMAIN_PLATFORMS.test(host))

export const SOURCES = [
  {id: 'openphish', name: 'OpenPhish', url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt', kind: 'urls'},
  {id: 'urlhaus', name: 'URLhaus (abuse.ch)', url: 'https://urlhaus.abuse.ch/downloads/text_recent/', kind: 'urls'},
  {id: 'phishtank', name: 'PhishTank', url: 'https://data.phishtank.com/data/online-valid.csv', kind: 'csv'},
  {id: 'phishingdb', name: 'Phishing.Database', url: 'https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt', kind: 'domains'},
  {id: 'phishingarmy', name: 'Phishing Army', url: 'https://phishing.army/download/phishing_army_blocklist.txt', kind: 'domains'},
] as const
export type SourceId = (typeof SOURCES)[number]['id']

const SHARDS = 64
const shardOf = (key: string) => parseInt(createHash('sha1').update(key).digest('hex').slice(0, 4), 16) % SHARDS

// Hosts a scammer owns outright are blocked as a whole; on shared platforms only the exact URL counts.
// Feeds sometimes list a real brand's own domain (e.g. an abused google.com/url redirect). Those are never blocked whole.
const OFFICIAL = new Set((brands as {domains: string[]}[]).flatMap((b) => b.domains.map((d) => d.toLowerCase())))
const isOfficial = (host: string) => {
  const parts = host.split('.')
  for (let i = 0; i < parts.length - 1; i++) if (OFFICIAL.has(parts.slice(i).join('.'))) return true
  return false
}

function keysForUrl(raw: string): string[] {
  try {
    const u = new URL(raw.trim())
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (urlOnly(host) || isOfficial(host)) {
      const rest = `${u.pathname.replace(/\/$/, '')}${u.search}`
      return rest ? [`${host}${rest}`] : []
    }
    return [host]
  } catch {
    return []
  }
}

function parseCsvUrls(csv: string): string[] {
  // phish_id,url,phish_detail_url,... ; urls may be quoted
  const out: string[] = []
  for (const line of csv.split('\n').slice(1)) {
    const m = line.match(/^\d+,("(?:[^"]|"")*"|[^,]*),/)
    if (m) out.push(m[1].replace(/^"|"$/g, '').replace(/""/g, '"'))
  }
  return out
}

export type BlocklistMeta = {builtAt: string; total: number; sources: {id: string; name: string; ok: boolean; entries: number}[]}

export async function buildBlocklist(): Promise<BlocklistMeta> {
  const map = new Map<string, Set<string>>()
  const add = (k: string, src: string) => {
    if (!k || k.length > 300) return
    let s = map.get(k)
    if (!s) map.set(k, (s = new Set()))
    s.add(src)
  }
  const sources: BlocklistMeta['sources'] = []
  await Promise.all(
    SOURCES.map(async (s) => {
      try {
        const res = await fetch(s.url, {signal: AbortSignal.timeout(60_000), headers: {'user-agent': 'phishtank/redflag-check'}})
        if (!res.ok) throw new Error(String(res.status))
        const text = await res.text()
        let n = 0
        if (s.kind === 'domains') {
          for (const l of text.split('\n')) {
            const d = l.trim().toLowerCase().replace(/^www\./, '')
            if (d && !d.startsWith('#') && !urlOnly(d) && !isOfficial(d)) {
              add(d, s.id)
              n++
            }
          }
        } else {
          const urls = s.kind === 'csv' ? parseCsvUrls(text) : text.split('\n').filter((l) => /^https?:\/\//.test(l.trim()))
          for (const u of urls) for (const k of keysForUrl(u)) (add(k, s.id), n++)
        }
        sources.push({id: s.id, name: s.name, ok: true, entries: n})
      } catch {
        sources.push({id: s.id, name: s.name, ok: false, entries: 0})
      }
    }),
  )
  const shards: string[][] = Array.from({length: SHARDS}, () => [])
  for (const [k, srcs] of map) shards[shardOf(k)].push(`${k}\t${[...srcs].join(',')}`)
  for (let i = 0; i < SHARDS; i += 8) {
    await Promise.all(shards.slice(i, i + 8).map((lines, j) => saveJson(`blocklist/${String(i + j).padStart(2, '0')}.json`, lines)))
  }
  const meta: BlocklistMeta = {builtAt: new Date().toISOString(), total: map.size, sources: sources.sort((a, b) => a.id.localeCompare(b.id))}
  await saveJson('blocklist/meta.json', meta)
  shardCache.clear()
  return meta
}

const shardCache = new Map<number, {at: number; map: Map<string, string>}>()
async function shard(i: number): Promise<Map<string, string>> {
  const hit = shardCache.get(i)
  if (hit && Date.now() - hit.at < 6 * 3_600_000) return hit.map
  const lines = (await loadJson<string[]>(`blocklist/${String(i).padStart(2, '0')}.json`)) ?? []
  const map = new Map(lines.map((l) => l.split('\t') as [string, string]))
  shardCache.set(i, {at: Date.now(), map})
  return map
}

// Live OpenPhish, for anything newer than last night's build.
let live: {at: number; keys: Set<string>} | null = null
async function liveOpenPhish(): Promise<Set<string>> {
  if (live && Date.now() - live.at < 30 * 60_000) return live.keys
  try {
    const res = await fetch(SOURCES[0].url, {signal: AbortSignal.timeout(5000)})
    const keys = new Set((await res.text()).split('\n').flatMap(keysForUrl))
    live = {at: Date.now(), keys}
  } catch {}
  return live?.keys ?? new Set()
}

const NAMES = Object.fromEntries(SOURCES.map((s) => [s.id, s.name]))

// Returns the names of the lists that know this URL, or null.
export async function isKnownPhish(urls: string[]): Promise<string | null> {
  const keys = [...new Set(urls.filter(Boolean).flatMap(keysForUrl))]
  if (!keys.length) return null
  const lv = await liveOpenPhish()
  const found = new Set<string>()
  for (const k of keys) if (lv.has(k)) found.add('OpenPhish')
  await Promise.all(
    keys.map(async (k) => {
      const src = (await shard(shardOf(k))).get(k)
      if (src) for (const s of src.split(',')) found.add(NAMES[s] ?? s)
    }),
  )
  return found.size ? [...found].join(', ') : null
}

export const blocklistMeta = () => loadJson<BlocklistMeta>('blocklist/meta.json')
