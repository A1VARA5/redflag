// urlscan.io: opens a link in a sandboxed browser and records what the page looks like.
// We reuse a recent public scan of the same domain when there is one, otherwise start an unlisted scan.
export type Scan = {uuid: string; time: string | null; malicious: boolean | null; pending: boolean; reused: boolean; page: string}

const KEY = () => process.env.URLSCAN_API_KEY

export async function recentScan(host: string): Promise<Scan | null> {
  const key = KEY()
  if (!key) return null
  try {
    const q = encodeURIComponent(`page.domain:${host} AND date:>now-30d`)
    const res = await fetch(`https://urlscan.io/api/v1/search/?q=${q}&size=1`, {headers: {'API-Key': key}, signal: AbortSignal.timeout(4000)})
    if (!res.ok) return null
    const r = ((await res.json()) as {results?: {_id: string; task?: {time?: string}; verdicts?: {malicious?: boolean}}[]}).results?.[0]
    if (!r) return null
    return {uuid: r._id, time: r.task?.time?.slice(0, 10) ?? null, malicious: r.verdicts?.malicious ?? null, pending: false, reused: true, page: `https://urlscan.io/result/${r._id}/`}
  } catch {
    return null
  }
}

export async function submitScan(url: string): Promise<Scan | null> {
  const key = KEY()
  if (!key) return null
  try {
    const res = await fetch('https://urlscan.io/api/v1/scan/', {
      method: 'POST',
      headers: {'API-Key': key, 'content-type': 'application/json'},
      body: JSON.stringify({url, visibility: 'unlisted', tags: ['redflag']}),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const j = (await res.json()) as {uuid?: string}
    if (!j.uuid) return null
    return {uuid: j.uuid, time: new Date().toISOString().slice(0, 10), malicious: null, pending: true, reused: false, page: `https://urlscan.io/result/${j.uuid}/`}
  } catch {
    return null
  }
}

export async function scanStatus(uuid: string): Promise<{ready: boolean; malicious: boolean | null}> {
  try {
    const res = await fetch(`https://urlscan.io/api/v1/result/${uuid}/`, {signal: AbortSignal.timeout(5000)})
    if (res.status === 404) return {ready: false, malicious: null}
    if (!res.ok) return {ready: false, malicious: null}
    const j = (await res.json()) as {verdicts?: {overall?: {malicious?: boolean}}}
    return {ready: true, malicious: j.verdicts?.overall?.malicious ?? null}
  } catch {
    return {ready: false, malicious: null}
  }
}
