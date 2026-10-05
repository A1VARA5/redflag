// VirusTotal URL reputation: 70+ security engines. Free key: 4 lookups a minute, so it is rationed
// (full checks only, suspicious-looking links only, cached for an hour).
export type VtResult = {malicious: number; suspicious: number; harmless: number; total: number; scannedAt: string | null; link: string}

const cache = new Map<string, {at: number; v: VtResult | null}>()
let stamps: number[] = []

export async function virusTotal(url: string): Promise<VtResult | null> {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return null
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < 3_600_000) return hit.v
  stamps = stamps.filter((t) => Date.now() - t < 60_000)
  if (stamps.length >= 4) return null
  stamps.push(Date.now())
  const id = Buffer.from(url).toString('base64url')
  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/urls/${id}`, {headers: {'x-apikey': key}, signal: AbortSignal.timeout(5000)})
    if (res.status === 404) {
      cache.set(url, {at: Date.now(), v: null})
      return null
    }
    if (!res.ok) return null
    const a = ((await res.json()) as {data?: {attributes?: {last_analysis_stats?: Record<string, number>; last_analysis_date?: number}}}).data?.attributes
    const s = a?.last_analysis_stats
    if (!s) return null
    const v: VtResult = {
      malicious: s.malicious ?? 0,
      suspicious: s.suspicious ?? 0,
      harmless: s.harmless ?? 0,
      total: Object.values(s).reduce((x, y) => x + y, 0),
      scannedAt: a?.last_analysis_date ? new Date(a.last_analysis_date * 1000).toISOString().slice(0, 10) : null,
      link: `https://www.virustotal.com/gui/url/${id}`,
    }
    cache.set(url, {at: Date.now(), v})
    return v
  } catch {
    return null
  }
}
