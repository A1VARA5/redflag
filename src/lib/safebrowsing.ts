// Google Safe Browsing (Lookup API v4): the same list Chrome uses to show its red "Deceptive site ahead" page.
// Optional: only runs when GOOGLE_SAFE_BROWSING_KEY is set.
const TYPES: Record<string, string> = {
  SOCIAL_ENGINEERING: 'phishing / deceptive site',
  MALWARE: 'malware',
  UNWANTED_SOFTWARE: 'unwanted software',
  POTENTIALLY_HARMFUL_APPLICATION: 'harmful app',
}

export async function safeBrowsing(urls: string[]): Promise<Map<string, string>> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY
  const out = new Map<string, string>()
  const list = [...new Set(urls.filter((u) => /^https?:\/\//.test(u)))].slice(0, 20)
  if (!key || !list.length) return out
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        client: {clientId: 'redflag-check', clientVersion: '1.0'},
        threatInfo: {
          threatTypes: Object.keys(TYPES),
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: list.map((url) => ({url})),
        },
      }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return out
    const data = (await res.json()) as {matches?: {threat: {url: string}; threatType: string}[]}
    for (const m of data.matches ?? []) out.set(m.threat.url, TYPES[m.threatType] ?? m.threatType)
  } catch {}
  return out
}
