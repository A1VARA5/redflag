// Public phishing blocklists. Downloaded at most every 30 minutes per server instance, held in memory.
const TTL = 30 * 60_000
const SHARED_HOSTING =
  /(^|\.)(google\.com|googleusercontent\.com|github\.io|vercel\.app|netlify\.app|pages\.dev|workers\.dev|web\.app|firebaseapp\.com|blogspot\.com|wixsite\.com|weebly\.com|square\.site|sharepoint\.com|onedrive\.live\.com|dropbox\.com|ipfs\.io|r2\.dev|amazonaws\.com|azurewebsites\.net|webflow\.io|glitch\.me|replit\.app|notion\.site|canva\.site|framer\.app)$/

type Cache = {at: number; urls: Set<string>; hosts: Set<string>}
let openphish: Cache | null = null
let loading: Promise<Cache> | null = null

async function loadOpenPhish(): Promise<Cache> {
  const res = await fetch('https://openphish.com/feed.txt', {signal: AbortSignal.timeout(6000)})
  if (!res.ok) throw new Error(`openphish ${res.status}`)
  const lines = (await res.text()).split('\n').map((l) => l.trim()).filter(Boolean)
  const hosts = new Set<string>()
  for (const l of lines) {
    try {
      hosts.add(new URL(l).hostname.toLowerCase())
    } catch {}
  }
  return {at: Date.now(), urls: new Set(lines), hosts}
}

async function getOpenPhish(): Promise<Cache | null> {
  if (openphish && Date.now() - openphish.at < TTL) return openphish
  loading ??= loadOpenPhish().finally(() => (loading = null))
  try {
    openphish = await loading
  } catch {
    // Feed down: keep the stale copy rather than nothing.
  }
  return openphish
}

// URLhaus (abuse.ch) needs a free Auth-Key. Skipped when the key is not set.
async function urlhaus(url: string): Promise<boolean> {
  const key = process.env.URLHAUS_AUTH_KEY
  if (!key || !/^https?:/.test(url)) return false
  try {
    const res = await fetch('https://urlhaus-api.abuse.ch/v1/url/', {
      method: 'POST',
      headers: {'Auth-Key': key, 'content-type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({url}),
      signal: AbortSignal.timeout(4000),
    })
    const data = (await res.json()) as {query_status?: string}
    return data.query_status === 'ok'
  } catch {
    return false
  }
}

// Returns the name of the list that knows this URL or host, or null.
export async function isKnownPhish(candidates: string[]): Promise<string | null> {
  const list = candidates.filter(Boolean)
  const op = await getOpenPhish()
  if (op) {
    for (const c of list) {
      if (op.urls.has(c) || op.urls.has(c.replace(/\/$/, ''))) return 'OpenPhish'
      // Host-level hits only for hosts a scammer owns outright, not shared platforms where one bad page sits next to millions of fine ones.
      if (!c.includes('/') && op.hosts.has(c) && !SHARED_HOSTING.test(c)) return 'OpenPhish'
    }
  }
  for (const c of list) if (c.includes('://') && (await urlhaus(c))) return 'URLhaus'
  return null
}

export async function feedStatus() {
  const op = await getOpenPhish()
  return {openphish: op ? {entries: op.urls.size, loadedAt: new Date(op.at).toISOString()} : null, urlhaus: Boolean(process.env.URLHAUS_AUTH_KEY)}
}
